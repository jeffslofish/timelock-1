// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract TimeLock {
    address public owner;
    address public beneficiary;
    uint256 public unlockTime;

    // Event emitted when MATIC is received
    event Received(address indexed from, uint256 amount);

    constructor(address _beneficiary, uint256 _unlockTime) {
        owner = msg.sender;
        beneficiary = _beneficiary;
        unlockTime = _unlockTime;
    }

    // Fallback function to receive MATIC
    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    function withdraw() external {
        require(msg.sender == beneficiary, "You are not the beneficiary");
        require(block.timestamp >= unlockTime, "The lock period has not ended yet");
        uint256 amount = address(this).balance; // Get the balance of MATIC tokens held by the contract
        require(amount > 0, "No MATIC tokens to withdraw");
        payable(beneficiary).transfer(amount); // Transfer MATIC tokens to the beneficiary
    }
}
