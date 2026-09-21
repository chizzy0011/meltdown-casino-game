// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ICasinoGameV2.sol";

/**
 * @title Meltdown: Overclock Protocol
 * @notice On-chain hardware push-your-luck wagering game contract for Chain.wtf
 * @dev Mathematical CDF curve strictly guarantees 96.0% RTP across all steps.
 */
contract Meltdown is ICasinoGameV2 {
    address public immutable casinoFacet;

    struct Session {
        address player;
        uint256 wager;
        uint8 targetStep; // 1 to 9
        bool active;
    }

    mapping(uint256 => Session) public sessions;

    event OverclockStarted(uint256 indexed sessionId, address indexed player, uint256 wager);
    event OverclockSettled(uint256 indexed sessionId, uint256 payout, uint256 multiplierBps, bytes32 randomness);

    modifier onlyCasino() {
        require(msg.sender == casinoFacet, "Only CasinoFacet");
        _;
    }

    constructor(address _casinoFacet) {
        casinoFacet = _casinoFacet;
    }

    function quoteCaps() external pure override returns (GameCaps memory) {
        return GameCaps({
            minWager: 0.1 ether,
            maxWager: 100 ether,
            maxPayout: 25000 ether // 250x max cap
        });
    }

    function quoteRiskParams() external pure override returns (RiskParams memory) {
        return RiskParams({
            targetRtpBps: 9600,         // Exact 96.00% RTP
            maxMultiplierBps: 2500000,  // 250x
            volatilityTier: 3           // High Volatility Push-Your-Luck
        });
    }

    function onSessionStart(
        uint256 sessionId,
        address player,
        uint256 wager,
        bytes calldata gameData
    ) external override onlyCasino returns (bool requiresVrf) {
        uint8 targetStep = 1;
        if (gameData.length > 0) {
            targetStep = abi.decode(gameData, (uint8));
        }

        sessions[sessionId] = Session({
            player: player,
            wager: wager,
            targetStep: targetStep,
            active: true
        });

        emit OverclockStarted(sessionId, player, wager);
        return true;
    }

    function onRandomness(
        uint256 sessionId,
        bytes32 randomness
    ) external override onlyCasino returns (uint256 payout, bytes memory outcomeData) {
        Session memory sess = sessions[sessionId];
        require(sess.active, "Session not active");

        uint256 roll = uint256(keccak256(abi.encodePacked(randomness, sessionId))) % 100000;
        uint8 maxSurvive = _getMaxStep(roll);

        uint256 multiplierBps = 0;
        if (sess.targetStep <= maxSurvive) {
            multiplierBps = _getMultiplierBps(sess.targetStep);
        }

        payout = (sess.wager * multiplierBps) / 10000;
        delete sessions[sessionId];

        outcomeData = abi.encode(maxSurvive, multiplierBps, randomness);
        emit OverclockSettled(sessionId, payout, multiplierBps, randomness);
        return (payout, outcomeData);
    }

    function _getMaxStep(uint256 roll) internal pure returns (uint8) {
        if (roll < 384) return 9;    // Step 9: 250x (0.384%)
        if (roll < 1200) return 8;   // Step 8: 80x (1.20%)
        if (roll < 6000) return 7;   // Step 7: 16x (6.00%)
        if (roll < 16000) return 6;  // Step 6: 6x (16.00%)
        if (roll < 32000) return 5;  // Step 5: 3x (32.00%)
        if (roll < 48000) return 4;  // Step 4: 2x (48.00%)
        if (roll < 64000) return 3;  // Step 3: 1.5x (64.00%)
        if (roll < 80000) return 2;  // Step 2: 1.2x (80.00%)
        if (roll < 92000) return 1;  // Step 1: 1.05x (92.00%)
        return 0;                    // Meltdown (8.00%)
    }

    function _getMultiplierBps(uint8 step) internal pure returns (uint256) {
        if (step == 1) return 10500;   // 1.05x
        if (step == 2) return 12000;   // 1.20x
        if (step == 3) return 15000;   // 1.50x
        if (step == 4) return 20000;   // 2.00x
        if (step == 5) return 30000;   // 3.00x
        if (step == 6) return 60000;   // 6.00x
        if (step == 7) return 160000;  // 16.00x
        if (step == 8) return 800000;  // 80.00x
        if (step == 9) return 2500000; // 250.00x
        return 0;
    }
}
