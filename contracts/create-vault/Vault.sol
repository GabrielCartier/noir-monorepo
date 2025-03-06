// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Ownable.sol";
import "./ReentrancyGuard.sol";
import "./Pausable.sol";
import "./IERC20.sol";
import "./SafeERC20.sol";

contract Vault is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    struct VaultInfo {
        string name;
        string description;
        string vaultType;
        uint256 totalDeposits;
        uint256 totalWithdrawals;
        uint256 lastActivity;
        bool isActive;
    }

    IERC20 public immutable token;
    VaultInfo public vaultInfo;
    mapping(address => uint256) public balances;
    mapping(address => uint256) public lastDepositTime;
    mapping(address => bool) public isWhitelisted;

    event VaultCreated(string name, string description, string vaultType);
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event VaultPaused();
    event VaultUnpaused();
    event UserWhitelisted(address indexed user);
    event UserRemoved(address indexed user);

    constructor(
        address _token,
        string memory _name,
        string memory _description,
        string memory _vaultType
    ) Ownable(msg.sender) {
        require(_token != address(0), "Invalid token address");
        token = IERC20(_token);
        
        vaultInfo = VaultInfo({
            name: _name,
            description: _description,
            vaultType: _vaultType,
            totalDeposits: 0,
            totalWithdrawals: 0,
            lastActivity: block.timestamp,
            isActive: true
        });

        emit VaultCreated(_name, _description, _vaultType);
    }

    modifier onlyWhitelisted() {
        require(isWhitelisted[msg.sender], "User not whitelisted");
        _;
    }

    modifier whenVaultActive() {
        require(vaultInfo.isActive, "Vault is not active");
        _;
    }

    function deposit(uint256 amount) 
        external 
        nonReentrant 
        whenNotPaused 
        whenVaultActive 
        onlyWhitelisted 
    {
        require(amount > 0, "Amount must be greater than 0");
        
        token.safeTransferFrom(msg.sender, address(this), amount);
        
        balances[msg.sender] += amount;
        vaultInfo.totalDeposits += amount;
        vaultInfo.lastActivity = block.timestamp;
        lastDepositTime[msg.sender] = block.timestamp;
        
        emit Deposited(msg.sender, amount);
    }

    function withdraw(uint256 amount) 
        external 
        nonReentrant 
        whenNotPaused 
        whenVaultActive 
        onlyWhitelisted 
    {
        require(amount > 0, "Amount must be greater than 0");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        balances[msg.sender] -= amount;
        vaultInfo.totalWithdrawals += amount;
        vaultInfo.lastActivity = block.timestamp;
        
        token.safeTransfer(msg.sender, amount);
        
        emit Withdrawn(msg.sender, amount);
    }

    function getBalance(address user) external view returns (uint256) {
        return balances[user];
    }

    function getVaultInfo() external view returns (VaultInfo memory) {
        return vaultInfo;
    }

    function whitelistUser(address user) external onlyOwner {
        require(user != address(0), "Invalid user address");
        isWhitelisted[user] = true;
        emit UserWhitelisted(user);
    }

    function removeUser(address user) external onlyOwner {
        require(user != address(0), "Invalid user address");
        isWhitelisted[user] = false;
        emit UserRemoved(user);
    }

    function pause() external onlyOwner {
        _pause();
        emit VaultPaused();
    }

    function unpause() external onlyOwner {
        _unpause();
        emit VaultUnpaused();
    }

    function setVaultStatus(bool _isActive) external onlyOwner {
        vaultInfo.isActive = _isActive;
    }
} 