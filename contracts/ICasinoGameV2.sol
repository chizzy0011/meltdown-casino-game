// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ICasinoGameV2 {
    struct GameCaps {
        uint256 minWager;
        uint256 maxWager;
        uint256 maxPayout;
    }

    struct RiskParams {
        uint256 targetRtpBps;
        uint256 maxMultiplierBps;
        uint256 volatilityTier;
    }

    function quoteCaps() external view returns (GameCaps memory);
    function quoteRiskParams() external view returns (RiskParams memory);
    function onSessionStart(uint256 sessionId, address player, uint256 wager, bytes calldata gameData) external returns (bool requiresVrf);
    function onRandomness(uint256 sessionId, bytes32 randomness) external returns (uint256 payout, bytes memory outcomeData);
}
