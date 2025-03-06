// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {VaultFactory} from "../src/VaultFactory.sol";

contract DeployScript is Script {

    function run() external {
        // Load the private key from .env
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);

        // Deploy OptionsVault
        VaultFactory vaultFactory = new VaultFactory();

        vm.stopBroadcast();

        // Log the deployed addresses
        console.log("VaultFactory deployed to:", address(vaultFactory));
    }
}
