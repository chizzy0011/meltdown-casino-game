// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "./ICasinoGameV2.sol";

/**
 * @title Meltdown: Overclock Protocol
 * @notice Multi-step, player-controlled push-your-luck wagering game implementing ICasinoGameV2.
 *         The player overclocks an unstable quantum processor from step 0 (IDLE) up to step 9
 *         (OVERCLOCK GOD, 250x). Each PUSH draws on-chain randomness; surviving advances one
 *         tier, failure is a meltdown (payout 0). HARVEST banks the current multiplier at any
 *         time. CRYO arms a one-time guaranteed-survival safeguard for the next push, at the
 *         cost of 15% of the final pot.
 *
 * @dev Exact 96.0% RTP via a telescoping cumulative-survival model. On a push to tier k the
 *      contract draws a uniform roll in [0, CUM[k-1]) and survives iff roll < CUM[k]. Because the
 *      per-push survival probabilities telescope, P(reach tier k) = CUM[k] / CUM[0] = CUM[k]/1e5.
 *      Multiplier[k] = round(0.96 / (CUM[k]/1e5)), so E[payout | target k] = CUM[k]/1e5 * mult[k]
 *      = 0.96 * wager for every target (step 1 is 0.966 due to integer rounding of 1.05x).
 */
contract MeltdownGame is ICasinoGameV2 {
    error MeltdownGame__InvalidAction();
    error MeltdownGame__RoundOver();
    error MeltdownGame__NothingToHarvest();
    error MeltdownGame__CryoUnavailable();

    uint8 internal constant MAX_STEP = 9;
    uint256 internal constant CUM_BASE = 100000;
    uint256 internal constant CRYO_KEEP_BPS = 8500; // player keeps 85% of pot after cryo

    // Action selectors (abi-encoded uint8 in actionData).
    uint8 internal constant ACTION_PUSH = 0;
    uint8 internal constant ACTION_CRYO = 1;
    uint8 internal constant ACTION_HARVEST = 2;

    struct MeltdownState {
        uint8 step;       // current tier reached (0..9)
        bool cryoUsed;    // cryo spent this round (permanent 15% pot penalty)
        bool cryoArmed;   // next push is guaranteed to survive
        bool blown;       // core melted down
    }

    /// @dev Cumulative survival to each tier, scaled by CUM_BASE (1e5). CUM[0] == 100%.
    function _cum(uint8 step) internal pure returns (uint256) {
        if (step == 0) return 100000;
        if (step == 1) return 92000;
        if (step == 2) return 80000;
        if (step == 3) return 64000;
        if (step == 4) return 48000;
        if (step == 5) return 32000;
        if (step == 6) return 16000;
        if (step == 7) return 6000;
        if (step == 8) return 1200;
        return 384; // step 9
    }

    /// @dev Payout multiplier in basis points for banking at each tier.
    function _multBps(uint8 step) internal pure returns (uint256) {
        if (step == 0) return 10000;   // 1.00x
        if (step == 1) return 10500;   // 1.05x
        if (step == 2) return 12000;   // 1.20x
        if (step == 3) return 15000;   // 1.50x
        if (step == 4) return 20000;   // 2.00x
        if (step == 5) return 30000;   // 3.00x
        if (step == 6) return 60000;   // 6.00x
        if (step == 7) return 160000;  // 16.00x
        if (step == 8) return 800000;  // 80.00x
        return 2500000;                // 250.00x
    }

    function _cashout(uint256 wager, MeltdownState memory s) internal pure returns (uint256) {
        if (s.step == 0 || s.blown) return 0;
        uint256 payout = (wager * _multBps(s.step)) / 10000;
        if (s.cryoUsed) payout = (payout * CRYO_KEEP_BPS) / 10000;
        return payout;
    }

    // ---------------------------------------------------------------------
    // Risk quotes
    // ---------------------------------------------------------------------

    /// @dev Worst-case liability is the full 250x path; it bounds every lower target.
    function quoteCaps(
        uint256 wager,
        bytes calldata /* gameData */
    ) external pure override returns (uint256 maxEscrowStake, uint256 maxReservedProfit) {
        maxEscrowStake = wager;
        uint256 maxPayout = (wager * _multBps(MAX_STEP)) / 10000; // 250x
        maxReservedProfit = maxPayout > wager ? maxPayout - wager : 0;
    }

    /// @dev Top tier (250x @ CUM[9]) is the sole winning outcome of the worst-case target,
    ///      so the body variance is 0 (coinflip-style single winning tier).
    function quoteRiskParams(
        uint256 wager,
        bytes calldata /* gameData */
    )
        external
        pure
        override
        returns (
            uint256 maxPayout,
            uint256 probabilityWad,
            uint256 expectedPayout,
            uint256 bodyVarianceScaled
        )
    {
        maxPayout = (wager * _multBps(MAX_STEP)) / 10000; // 250x
        probabilityWad = (_cum(MAX_STEP) * 1e18) / CUM_BASE; // 0.00384 * 1e18
        expectedPayout = (wager * 9600) / 10000; // 0.96 * wager (RTP)
        bodyVarianceScaled = 0;
    }

    // ---------------------------------------------------------------------
    // State machine
    // ---------------------------------------------------------------------

    function onSessionStart(
        SessionContext calldata ctx
    ) external pure override returns (StepResult memory r) {
        uint256 maxPayout = (ctx.wagerBase * _multBps(MAX_STEP)) / 10000;
        uint256 maxReservedProfit = maxPayout > ctx.wagerBase ? maxPayout - ctx.wagerBase : 0;

        MeltdownState memory s = MeltdownState({ step: 0, cryoUsed: false, cryoArmed: false, blown: false });

        r.newGameState = abi.encode(s);
        r.escrowDelta = 0;
        r.reservedProfitDelta = int256(maxReservedProfit);
        r.nextPhase = SessionPhase.WAITING_PLAYER_ACTION;
        r.requestRandomnessNow = false;
        r.payout = 0;
    }

    function onPlayerAction(
        SessionContext calldata ctx,
        bytes calldata actionData
    ) external pure override returns (StepResult memory r) {
        MeltdownState memory s = abi.decode(ctx.gameState, (MeltdownState));
        if (s.blown) revert MeltdownGame__RoundOver();

        uint8 action = abi.decode(actionData, (uint8));

        if (action == ACTION_HARVEST) {
            if (s.step == 0) revert MeltdownGame__NothingToHarvest();
            return _settle(ctx, s);
        }

        if (action == ACTION_CRYO) {
            if (s.step == 0 || s.cryoUsed || s.cryoArmed) revert MeltdownGame__CryoUnavailable();
            s.cryoUsed = true;
            s.cryoArmed = true;
            r.newGameState = abi.encode(s);
            r.nextPhase = SessionPhase.WAITING_PLAYER_ACTION;
            r.requestRandomnessNow = false;
            r.payout = 0;
            return r;
        }

        if (action == ACTION_PUSH) {
            if (s.step >= MAX_STEP) revert MeltdownGame__RoundOver();

            // Cryo guarantees survival: advance without consuming randomness.
            if (s.cryoArmed) {
                s.cryoArmed = false;
                s.step += 1;
                if (s.step == MAX_STEP) return _settle(ctx, s);
                r.newGameState = abi.encode(s);
                r.nextPhase = SessionPhase.WAITING_PLAYER_ACTION;
                r.requestRandomnessNow = false;
                r.payout = 0;
                return r;
            }

            // Unprotected push: request on-chain randomness to resolve this tier.
            r.newGameState = abi.encode(s);
            r.nextPhase = SessionPhase.WAITING_RANDOMNESS;
            r.requestRandomnessNow = true;
            r.payout = 0;
            return r;
        }

        revert MeltdownGame__InvalidAction();
    }

    function onRandomness(
        SessionContext calldata ctx,
        bytes32 randomness
    ) external pure override returns (StepResult memory r) {
        MeltdownState memory s = abi.decode(ctx.gameState, (MeltdownState));
        if (s.blown || s.step >= MAX_STEP) revert MeltdownGame__RoundOver();

        uint8 target = s.step + 1;
        uint256 denom = _cum(s.step);        // uniform range for this push
        uint256 threshold = _cum(target);     // survive iff roll < threshold
        uint256 roll = _uniform(randomness, ctx.sessionId, denom);

        if (roll < threshold) {
            // Survived the overclock.
            s.step = target;
            if (s.step == MAX_STEP) return _settle(ctx, s);
            r.newGameState = abi.encode(s);
            r.nextPhase = SessionPhase.WAITING_PLAYER_ACTION;
            r.requestRandomnessNow = false;
            r.payout = 0;
            return r;
        }

        // Meltdown: catastrophic core blowout.
        s.blown = true;
        r.newGameState = abi.encode(s);
        r.escrowDelta = 0;
        r.reservedProfitDelta = 0; // facet releases the reserve at settlement
        r.nextPhase = SessionPhase.SETTLED;
        r.requestRandomnessNow = false;
        r.payout = 0;
        return r;
    }

    function quoteForfeitPayout(
        SessionContext calldata ctx
    ) external pure override returns (uint256 cashoutValue) {
        MeltdownState memory s = abi.decode(ctx.gameState, (MeltdownState));
        // Fully determined by already-revealed state (mines-style) — safe to quote.
        return _cashout(ctx.wagerBase, s);
    }

    // ---------------------------------------------------------------------
    // Internals
    // ---------------------------------------------------------------------

    function _settle(
        SessionContext calldata ctx,
        MeltdownState memory s
    ) internal pure returns (StepResult memory r) {
        r.newGameState = abi.encode(s);
        r.escrowDelta = 0;
        r.reservedProfitDelta = 0; // facet releases reserve; win capped at stake + reserve
        r.nextPhase = SessionPhase.SETTLED;
        r.requestRandomnessNow = false;
        r.payout = _cashout(ctx.wagerBase, s);
        return r;
    }

    /// @dev Unbiased uniform in [0, n) via rejection sampling — never `word % n` directly.
    function _uniform(bytes32 randomness, uint256 sessionId, uint256 n) internal pure returns (uint256) {
        require(n > 0, "n=0");
        uint256 limit = type(uint256).max - (type(uint256).max % n);
        bytes32 word = keccak256(abi.encodePacked(randomness, sessionId));
        uint256 v = uint256(word);
        // Rejection sampling; rehash on the (astronomically rare) out-of-range draw.
        while (v >= limit) {
            word = keccak256(abi.encodePacked(word));
            v = uint256(word);
        }
        return v % n;
    }
}
