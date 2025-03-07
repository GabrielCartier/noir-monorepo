export const SONIC_STAKING_ABI = [
  // Deposit function
  'function deposit(uint256 amount) external',

  // View functions
  'function getRewards() external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',

  // Claim rewards function
  'function claimRewards() external',

  // Events
  'event Deposited(address indexed user, uint256 amount)',
  'event RewardsClaimed(address indexed user, uint256 amount)',
];
