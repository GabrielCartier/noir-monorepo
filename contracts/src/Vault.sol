// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {OwnableRoles} from "solady/auth/OwnableRoles.sol";
import {ReentrancyGuard} from "solady/utils/ReentrancyGuard.sol";
import {ERC20} from "solady/tokens/ERC20.sol";

contract Vault is OwnableRoles, ReentrancyGuard {
    mapping(address => uint256) public balances;
    bool public isPaused;
    uint256 private constant AGENT_ROLE = 1;

    event VaultCreated(address indexed vaultAddress, address indexed owner);
    event Deposited(address indexed token, address indexed user, uint256 amount);
    event Withdrawn(address indexed token, address indexed user, uint256 amount);
    event NativeDeposited(address indexed user, uint256 amount);
    event NativeWithdrawn(address indexed user, uint256 amount);

    error VaultPaused();
    error InvalidAmount();
    error InsufficientBalance();
    error TransferFailed();

    constructor(address owner, address agentAddress) {
        _initializeOwner(owner);
        _grantRoles(agentAddress, AGENT_ROLE);
        isPaused = false;
        emit VaultCreated(address(this), owner);
    }

    receive() external payable notPaused {
        emit NativeDeposited(msg.sender, msg.value);
    }

    function withdrawNative(uint256 amount) external nonReentrant notPaused onlyOwnerOrRoles(AGENT_ROLE) amountNotZero(amount) {
        if (address(this).balance < amount) {
            revert InsufficientBalance();
        }
        
        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) {
            revert TransferFailed();
        }
        
        emit NativeWithdrawn(msg.sender, amount);
    }

    function deposit(
        address token,
        uint256 amount
    ) external nonReentrant notPaused onlyOwnerOrRoles(AGENT_ROLE) amountNotZero(amount) {
        ERC20(token).transferFrom(msg.sender, address(this), amount);
        emit Deposited(token, msg.sender, amount);
    }

    function withdraw(
        address token,
        uint256 amount
    ) external nonReentrant notPaused onlyOwnerOrRoles(AGENT_ROLE) amountNotZero(amount) {
        if (ERC20(token).balanceOf(address(this)) < amount) {
            revert InsufficientBalance();
        }
        ERC20(token).transfer(msg.sender, amount);
        emit Withdrawn(token, msg.sender, amount);
    }

    function getBalance(address token) external view returns (uint256) {
        return ERC20(token).balanceOf(address(this));
    }

    function getNativeBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function pause() external onlyOwner {
        isPaused = true;
    }

    function unpause() external onlyOwner {
        isPaused = false;
    }

    modifier notPaused() {
        if (isPaused) {
            revert VaultPaused();
        }
        _;
    }

    modifier amountNotZero(uint256 amount) {
        if (amount <= 0) {
            revert InvalidAmount();
        }
        _;
    }
}
