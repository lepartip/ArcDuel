// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ArcDuel — 1v1 prediction duel, winner takes the pot
contract ArcDuel {
    enum Status { Open, Accepted, Resolved, Cancelled }

    struct Duel {
        uint256 id;
        address creator;
        address opponent;
        string question;
        string optionA;
        string optionB;
        uint8 creatorPick; // 1=A, 2=B
        uint8 opponentPick;
        uint256 stake;     // each side puts in this amount
        uint8 result;      // 1=A wins, 2=B wins
        Status status;
        uint256 createdAt;
        uint256 resolvedAt;
    }

    Duel[] public duels;
    bool private locked;
    modifier noReentrant() { require(!locked); locked = true; _; locked = false; }

    event DuelCreated(uint256 indexed id, address indexed creator, address indexed opponent, string question, uint256 stake);
    event DuelAccepted(uint256 indexed id, address indexed opponent, uint8 pick);
    event DuelResolved(uint256 indexed id, address indexed winner, uint8 result);
    event DuelCancelled(uint256 indexed id);

    function create(address opponent, string calldata question, string calldata optionA, string calldata optionB, uint8 creatorPick) external payable returns (uint256) {
        require(msg.value > 0, "Stake required");
        require(opponent != address(0) && opponent != msg.sender, "Invalid opponent");
        require(bytes(question).length > 0, "Question required");
        require(creatorPick == 1 || creatorPick == 2, "Pick A(1) or B(2)");
        uint256 id = duels.length;
        duels.push(Duel(id, msg.sender, opponent, question, optionA, optionB, creatorPick, 0, msg.value, 0, Status.Open, block.timestamp, 0));
        emit DuelCreated(id, msg.sender, opponent, question, msg.value);
        return id;
    }

    function accept(uint256 id, uint8 pick) external payable noReentrant {
        require(id < duels.length, "Not found");
        Duel storage d = duels[id];
        require(d.status == Status.Open, "Not open");
        require(msg.sender == d.opponent, "Not the opponent");
        require(msg.value >= d.stake, "Wrong stake");
        require(pick == 1 || pick == 2, "Pick A(1) or B(2)");
        require(pick != d.creatorPick, "Must pick different side");
        d.opponentPick = pick;
        d.status = Status.Accepted;
        emit DuelAccepted(id, msg.sender, pick);
    }

    function resolve(uint256 id, uint8 result) external noReentrant {
        require(id < duels.length, "Not found");
        Duel storage d = duels[id];
        require(d.status == Status.Accepted, "Not accepted");
        require(msg.sender == d.creator, "Only creator resolves");
        require(result == 1 || result == 2, "Result A(1) or B(2)");
        d.result = result;
        d.status = Status.Resolved;
        d.resolvedAt = block.timestamp;
        address winner = (result == d.creatorPick) ? d.creator : d.opponent;
        uint256 payout = d.stake * 2;
        (bool ok,) = payable(winner).call{value: payout}("");
        require(ok, "Payout failed");
        emit DuelResolved(id, winner, result);
    }

    function cancel(uint256 id) external noReentrant {
        require(id < duels.length, "Not found");
        Duel storage d = duels[id];
        require(d.status == Status.Open, "Not open");
        require(msg.sender == d.creator, "Only creator");
        d.status = Status.Cancelled;
        (bool ok,) = payable(d.creator).call{value: d.stake}("");
        require(ok, "Refund failed");
        emit DuelCancelled(id);
    }

    function getAll(uint256 count) external view returns (Duel[] memory) {
        uint256 len = duels.length;
        uint256 n = count > len ? len : count;
        Duel[] memory result = new Duel[](n);
        for (uint256 i = 0; i < n; i++) result[i] = duels[len - 1 - i];
        return result;
    }

    function total() external view returns (uint256) { return duels.length; }
    receive() external payable {}
}
