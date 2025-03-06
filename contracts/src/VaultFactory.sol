// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import {Vault} from "./Vault.sol";

contract VaultFactory {
    mapping(address => address) public userVault;

    event VaultCreated(address indexed vault, address indexed owner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    function createVault(address agentAddress) external returns (address) {
        Vault vault = new Vault(agentAddress);
        address vaultAddress = address(vault);

        userVault[msg.sender] = vaultAddress;
        emit VaultCreated(vaultAddress, msg.sender);
        return vaultAddress;
    }

    function getUserVault(address user) external view returns (address) {
        return userVault[user];
    }
}
