import Game from "../models/game.model.js";
import { generateUniqueCode } from "../lib/utils.js";
import { getSocket, io } from "../lib/socket.js";
import { boardData } from "../lib/data.js";
import { handleLandedOn } from "../lib/gameUtils.js";

export const createGame = async (req, res) => {
    try {
        const hostId = req.user._id;
        console.log(hostId);
        
        const code = await generateUniqueCode();

        const newGame = new Game({
            code, 
            hostId,
            currentTurn: hostId,
            boardState: boardData,
        });
        newGame.players.push({ userId: hostId });
        await newGame.save();

        const game = await Game.findById(newGame._id).populate("players.userId", "username");
        if (game){
            const socket = getSocket(hostId);

            socket.join(code);
            // io.to(socket).emit("joined-room", game);

            const room = await io.in(code).fetchSockets();
            const usersInRoom = room.map(s => s.id).filter(id => id !== socket.id);

            socket.emit("existing-users", {usersInRoom});
            console.log("existing-users emitted");

            res.status(201).json({ message: "Game Created Successfully", game: game });
        }else{
            res.status(400).json({message: "Invalid game details"});
            console.log("Invalid game details");
        }
        // req.game = newGame;
        
    } catch (error) {
        console.log("error in create game controller", error.message);
        res.status(500).json({message: "Error Creating Game"});
    }
}

export const joinGame = async (req, res) => {
    try {
        const userId = req.user._id;
        const {code} = req.params;
        const game = req.game;

        const playerExists = game.players.some(player => player.userId.toString() === userId.toString());

        if (playerExists)
            return res.status(400).json({message: "Player already joined"});

        if (game.players.length >= 8)
            return res.status(400).json({message: "Room is Full"});

        game.players.push({ userId });
        
        await game.save();
        await game.populate("players.userId", "username");
        // console.log(game);
        // const updatedGame = await Game.findOne({ code }).populate("players.userId", "username");
        // socket 
        // console.log(game.players);
        const socket = getSocket(userId);
        // console.log(socket.id);
        socket.join(code);
        // socket.join(socket.id);
        io.to(code).emit("joined-room", game);
            
        const room = await io.in(code).fetchSockets();
        const usersInRoom = room.map(s => s.id).filter(id => id !== socket.id);

        socket.emit("existing-users", {usersInRoom});
        console.log("existsing-users emitted");
        
        res.status(200).json({message: "Joined Game Successfully", game});

    } catch (error) {
        console.log("Error in join game controller", error);
        return res.status(500).json({message: "Error Joining Game"});
    }
}

export const startGame = async (req, res) => {
    try {
        const {code} = req.params;
        const game = req.game;
        const userId = req.user._id;
        // console.log(userId.toString());
        
        // const game = await Game.findOne({code});

        // if (!game)
        //     return res.status(400).json({message: "Game with code not found"});

        // if (game.started)
        //     return res.status(400).json({message: "Game already started"});

        // if (game.hostId.toString() !== userId.toString())
        //     return res.status(400).json({message: "Only host can start game", game: game});

        if (game.players.length < 2)
            return res.status(400).json({message: "2 or more players required"});


        game.turnOrder = game.players.map(player => player.userId._id.toString());
        game.turnOrder.sort(() => Math.random() - 0.5);

        game.currentTurn = game.turnOrder[0];
        game.started = true;

        await game.save();

        // const updatedGame = await Game.findOne({ code }).populate("players.userId", "username");
        // socket function
        const curr = game.currentTurn;
        const player = game.players.find((p) => p.userId._id.toString() === curr.toString());
        // console.log(player);
        // const socket = getSocket(curr);

        io.to(code).emit("game-started", game);
        io.to(code).emit("player-turn", player.userId);

        return res.status(201).json({message: "Game started successfully", game});

    } catch (error) {
        console.log("Error in start game controller", error);
        return res.status(500).json({message: "Error Starting Game"});
    }
}

export const rollDice = async (req, res) => {
    try {

        const userId = req.user._id;
        const {code} = req.params;
        const game = req.game;
        // const game = await Game.findOne({code}).populate("players.userId", "username").populate("boardState.owner", "username");

        // if (!game)
        //     return res.status(404).json({message: "Game not found"});

        // if (!game.started)
        //     return res.status(400).json({ message: "Game has not started yet" });

        if (game.currentTurn.toString() !== userId.toString())
            return res.status(403).json({ message: "Not your turn" });

        // console.log("player", game.players[0].userId);
        
        
        const playerIndex = game.players.findIndex(
            (p) => p.userId._id.toString() === userId.toString() 
        );
        // console.log(playerIndex);

        if (playerIndex === -1)
            return res.status(404).json({ message: "Player not found in game" });

        const name = game.players[playerIndex].userId;
        // console.log("name",name);
    
        const die1 = Math.ceil(Math.random() * 6);
        const die2 = Math.ceil(Math.random() * 6);
        const roll = die1 + die2;

        let newPosition = (game.players[playerIndex].position + roll) % 40;

        if (newPosition < game.players[playerIndex].position) {
            game.players[playerIndex].money += 2000; // Add $200 for passing GO
        }

        game.players[playerIndex].position = newPosition;

        //landed on
        const landed = handleLandedOn(game, playerIndex, userId);

        // const currentIndex = game.turnOrder.findIndex(
        //     (id) => id.toString() === userId.toString()
        // );
        // const nextIndex = (currentIndex + 1) % game.turnOrder.length;
        // game.currentTurn = game.turnOrder[nextIndex];

        await game.save();

        // const updatedGame = await Game.findOne({ code }).populate("players.userId", "username").populate("boardState.owner", "username");

        const socket = getSocket(userId);

        socket.to(code).emit("dice-rolled", {game, num: roll, name: name});

        if (landed.event === "landed-unowned-prop"){
            console.log("unowned");
            
            socket.to(code).emit(landed.event, {space: landed.space});

            res.status(200).json({
                message: `You rolled a ${roll}\nLanded on ${landed.space.name}`,
                buy: true,
                pay: false,
                own: false,
                landedOn: landed.space,
                game,
                dice: { die1, die2 },
                number: roll,
            });
        } else if (landed.event === "landed-owned-prop"){
            console.log("owned");
            
            socket.to(code).emit(landed.event, {space: landed.space});

            res.status(200).json({
                message: `You rolled a ${roll} Landed on ${landed.space.name} owned by ${landed.space.owner.username}. Rent owed is ${landed.space.base}`,
                buy: false,
                pay: true,
                own: false,
                landedOn: landed.space,
                game,
                dice: { die1, die2 },
                number: roll,
            });
        } else if (landed.event === "landed-your-prop") {
            console.log("yours");
            socket.to(code).emit(landed.event, {space: landed.space});
            res.status(200).json({
                message: `You rolled a ${roll} Landed on your own ${landed.space.name}`,
                buy: false,
                pay: false,
                own: true,
                landedOn: landed.space,
                game,
                dice: { die1, die2 },
                number: roll,
            });

        } else {
            console.log("error?");
        }

    } catch (error) {
        console.log("Error in roll dice controller", error.message);
        return res.status(500).json({message: "Error Rolling Dice"});
    }
}

export const endTurn = async (req, res) => {
    try {
        const userId = req.user._id;
        const {code} = req.params;
        const game = req.game;
        // const game = await Game.findOne({code}).populate("players.userId", "username");

        // if (!game)
        //     return res.status(404).json({message: "Game not found"});

        const currentIndex = game.turnOrder.findIndex(
            (id) => id.toString() === userId.toString()
        );
        const curr = game.players[currentIndex];

        const socket = getSocket(userId);
        socket.to(code).emit("end-turn", curr.userId);

        const nextIndex = (currentIndex + 1) % game.players.length;
        game.currentTurn = game.turnOrder[nextIndex];
    
        await game.save();
        await game.populate("players.userId", "username");
        await game.populate("currentTurn", "username");

        // io.to(code).emit("end-turn", curr.userId);
        console.log("curr:",game.currentTurn);
        

        io.to(code).emit("player-turn", {currentTurn: game.currentTurn, game});

        res.status(200).json({message:"Turn Ended", game})        
    } catch (error) {
        console.log("error in end turn controller", error.message); 
        res.status(500).json({message:"Error Ending Turn"});
    }

}

export const buyProp = async (req, res) => {
    const userId = req.user._id;
    const { code } = req.params;
    const game = req.game;
    try {
        // const game = await Game.findOne({code}).populate("players.userId", "username").populate("boardState.owner", "username");

        // if (!game)
        //     return res.status(404).json({message: "Game not found"});

        let playerIndex = game.players.findIndex(
            (p) => p.userId._id.toString() === userId.toString() 
        );
        let player = game.players[playerIndex];
        const property = game.boardState[player.position];

        if (player.money < property.price) return res.status(400).json({message: "Insufficient Balance"});

        player.money -= property.price;
        player.properties.push(player.position);
        property.owned = true;
        property.owner = userId;

        await game.save();

        const updatedGame = await Game.findOne({ code })
        .populate("currentTurn", "username")
        .populate("players.userId", "username")
        .populate("boardState.owner", "username");

        playerIndex = updatedGame.players.findIndex(
            (p) => p.userId._id.toString() === userId.toString() 
        );
        player = game.players[playerIndex];

        const yourProperties = updatedGame.boardState.filter((prop) => {
            return player.properties.includes(prop.id);
        });
        // console.log(yourProperties);
        
        const otherPlayersProperties = [];
        updatedGame.players.forEach((p) => {

            // if (p === player) return;

            const yourProperties = updatedGame.boardState.filter((prop) => {
                return p.properties.includes(prop.id);
            });
            otherPlayersProperties.push({player : p, properties: yourProperties});

        });
        // console.log(otherPlayersProperties);
        const yourMoney = updatedGame.players[playerIndex].money;
    
        const socket = getSocket(userId);
        socket.to(code).emit("property-bought", {player: player.userId.username, property: property.name, game: updatedGame, otherPlayersProperties: otherPlayersProperties});

        res.status(200).json({message: `You Bought ${property.name}`, game: updatedGame, yourProperties: yourProperties,  yourMoney: yourMoney});

    } catch (error) {
        console.log("error in buy property controller", error.message); 
        res.status(500).json({message:"Error Buying Property"});
    }
}

export const payRent = async (req, res) => {
    console.log("paying");
    console.log(req.user._id);
    
    const userId = req.user._id;
    const {code} = req.params;
    const {recipient, space} = req.body;
    const game = req.game;
    console.log(recipient);
    
    try {
        // const game = await Game.findOne({code}).populate("players.userId", "username").populate("boardState.owner", "username");
        // if (!game)
        //     return res.status(404).json({message: "Game not found"});

        const playerIndex = game.players.findIndex((player) => player.userId._id.toString() === userId.toString());
        const recieverIndex = game.players.findIndex((player) => player.userId._id.toString() === recipient._id.toString());

        game.players[playerIndex].money -= space.base;
        game.players[recieverIndex].money += space.base;

        await game.save();
        const updatedGame = await Game.findOne({code}).populate("players.userId", "username").populate("boardState.owner");


        const player =   updatedGame.players[playerIndex];
        const reciever = updatedGame.players[recieverIndex];

        const playerMoney = updatedGame.players[playerIndex].money;
        const recieverMoney = updatedGame.players[recieverIndex].money;

        const otherPlayersProperties = [];
        updatedGame.players.forEach((p) => {

            // if (p === player) return;

            const yourProperties = updatedGame.boardState.filter((prop) => {
                return p.properties.includes(prop.id);
            });
            otherPlayersProperties.push({player : p, properties: yourProperties});
        });

        const socket = getSocket(userId);
        socket.to(code).emit("paid-rent", ({player: player, reciever: reciever, space: space, game: updatedGame, yourMoney: recieverMoney, otherPlayersProperties }));

        const oPP = otherPlayersProperties.filter((opp) => opp.player.userId._id.toString() !== userId.toString());
        res.status(200).json({message: `Rent Paid Successfully to ${reciever.userId.username}`, game: updatedGame, yourMoney: playerMoney, otherPlayersProperties: oPP });
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Error Paying Rent"});
    }   
}

export const offerTrade = async (req, res) => {
    const userId = req.user._id;
    const { code } = req.params;
    const { tradeOffer } = req.body;
    try {
        const game = await Game.findOne({code}).populate("players.userId", "username").populate("boardState.owner", "username");
        const playerIndex = game.players.findIndex((player) => player.userId._id.toString() === userId.toString());
        const recieverIndex = game.players.findIndex((player) => player.userId._id.toString() === tradeOffer.recipient.player.userId._id.toString());
        
        const player =   game.players[playerIndex];
        const reciever = game.players[recieverIndex];

        const senderSocket = getSocket(userId);

        senderSocket.to(code).emit("trade-offer", {player, reciever, tradeOffer});
        res.status(200).json({message: "Trade Offered"});
    } catch (error) {
        console.log("error offering trade", error);
        res.status(400).json({message: "Error Offering trade"});
    }
}

export const acceptOffer = async(req, res)=>{
    const userId = req.user._id;
    const { code } = req.params;
    const { tradeOffer } = req.body;
    // console.log(tradeOffer);
    try {
        const game = await Game.findOne({code}).populate("players.userId", "username");
        const senderIndex = game.players.findIndex((player) => player.userId._id.toString() === tradeOffer.sender._id.toString());
        const receiverIndex = game.players.findIndex((player) => player.userId._id.toString() === userId.toString());

        const sender = game.players[senderIndex];
        const receiver = game.players[receiverIndex];
        // console.log(sender, receiver);
        
        console.log("sender", sender.properties);
        console.log("receiver", receiver.properties);

        sender.properties = sender.properties.filter((prop) => {
            return !tradeOffer.senderOffer.senderProp.map(p => p.id).includes(prop);
        });
        receiver.properties = receiver.properties.filter((prop) => {
            return !tradeOffer.senderAsk.askedProp.map(p => p.id).includes(prop);
        });
    
        console.log("sender", sender.properties);
        console.log("receiver", receiver.properties);

        sender.properties.push(... tradeOffer.senderAsk.askedProp.map(p => p.id));
        receiver.properties.push(... tradeOffer.senderOffer.senderProp.map(p => p.id));

        console.log("sender", sender.properties);
        console.log("receiver", receiver.properties);

        sender.properties?.forEach((p) => {
                game.boardState[p].owner = sender.userId._id;
                console.log(game.boardState[p].owner);
                
        });
        receiver.properties?.forEach((p) => {
                game.boardState[p].owner = receiver.userId._id;
                console.log(game.boardState[p].owner);
        });
        // sender.properties.forEach((prop) => {
        //     if (prop.owner != sender._id) prop.owner = sender._id;
        // });
        // receiver.properties.forEach((prop) => {
        //     if (prop.owner != receiver._id) prop.owner = receiver._id;
        // });

        sender.money -= tradeOffer.senderOffer.senderMoney;
        sender.money += tradeOffer.senderAsk.askedMoney;

        receiver.money -= tradeOffer.senderAsk.askedMoney;
        receiver.money += tradeOffer.senderOffer.senderMoney;

        await game.save();

        const updatedGame = await Game.findOne({code}).populate("players.userId", "username").populate("boardState.owner", "username");
        const updatedSender = updatedGame.players[senderIndex];
        const updatedReceiver = updatedGame.players[receiverIndex];
    
        console.log("updated-sender", updatedSender.properties);
        console.log("updated-receiver", updatedReceiver.properties);

        const otherPlayersProperties = [];

        const yourMoney = updatedReceiver.money;
        const yourProperties = updatedGame.boardState.filter((prop) => {
            return updatedReceiver.properties.includes(prop.id);
        });
        const senderProperties = updatedGame.boardState.filter((prop) => {
            return updatedSender.properties.includes(prop.id);
        })
        updatedGame.players.forEach((p) => {
            // if (p === player) return;
            const yourProperties = updatedGame.boardState.filter((prop) => {
                    return p.properties.includes(prop.id);
            });
            otherPlayersProperties.push({player : p, properties: yourProperties});
        });
        // console.log(otherPlayersProperties);
        
        const socket = getSocket(userId);
        socket.to(code).emit("trade-accepted", ({game: updatedGame, sender, senderProperties, otherPlayersProperties}));
        res.status(200).json({message:"Offer Accepted", game: updatedGame, yourMoney, yourProperties, otherPlayersProperties });

    } catch (error) {
        console.log("error accepting trade", error);
        res.status(400).json({message: "Internal Server Error"});
    }
}

export const rejectOffer = async (req, res) => {
    const userId = req.user._id;
    try {
        const {code} = req.params;
        const {tradeOffer} = req.body;
        
        const socket = getSocket(userId);
        socket.to(code).emit("trade-rejected", { tradeOffer });

        res.status(200).json({message: "Trade rejected", tradeOffer});
    } catch (error) {
        console.log("Error rejecting trade", error);
        res.status(400).json({message: "Internal Server Error"});
    }
}
export const buildHouse = async (req, res) => {
    const userId = req.user._id;
    const { code } = req.params;
    const { propertyIdx } = req.body;
    try {
        const game = await Game.findOne({code}).populate("players.userId", "username").populate("boardState.owner", "username");
        const playerIndex = game.players.findIndex((player) => player.userId._id.toString() === userId.toString());
        
        const player = game.players[playerIndex];
        const property = game.boardState[propertyIdx];

        const flag = player.properties.every(p => property.setPairIndices.includes(p));
        if (flag && property.houses <= 4){
            property.houses += 1;
            player.money -= property.hCost;
        } else {
            return res.status(400).json({message: "Cannot build more houses"});
        }
        await game.save();
        return res.status(200).json({message: "House Built Successfully"});

    } catch (error) {
        console.log(error.message);
        return res.status(400).json({message: "Error building house"});
    }
}
export const mortgageProp = async(req, res) => {
    const  userId  = req.user._id;
    const { code } = req.params;
    const { propertyIdx } = req.body;
    try {
        const game = await Game.findOne({code}).populate("players.userId", "username").populate("boardState.owner", "username");
        const playerIdx = game.players.find(p => p.userId._id.toString() === userId.toString());
        const player = game.players[playerIdx];

        if (!player.properties.includes(propertyIdx))
            return res.status(400).json({message:"Not the property owner"});
        
        const property = game.boardState[propertyIdx];

        property.mortgaged = true;
        await game.save();

        const socket = getSocket(userId);
        socket.to(code).emit("mortgaged-prop", {game  });
        res.status(200).json({message: "Mortgaged Successfully", game, property});
    } catch (error) {
        console.log(error);
        res.status(500).json({message: "Error mortgaging property"});
    }
}
export const unmortgageProp = async(req, res) => {
    const userId = req.user._id;
    const { code } = req.params;
    const { propertyIdx } = req.body;
    try {
        const game = Game.findOne({code}).populate("players.userId", "username").populate("boardState.owner", "username");
        const playerIdx = game.players.findIndex(p => p.userId._id.toString() === userId.toString());
        const player = game.players[playerIdx];
        if (!player.properties.includes(propertyIdx) || !game.boardState[propertyIdx].mortgaged){
            res.status(400).json({message: "Either not the property owner or property is not mortgaged"});
        }
        const property = game.boardState[propertyIdx];
        player.money -= (property.price/2 + property.price/20);
        property.mortgaged = false;
        await game.save();

        const socket = getSocket(userId);
        socket.to(code).emit("unmortgaged-prop", {});
        res.status(200).json({message: "Unmortgaged Successfully", game});

    } catch (error) {
        console.log(error);
        res.status(500).json({message: "Internal Server Error"});
    }
};
export const sellHouse = async (req, res) => {
    const userId = req.user._id;
    const { code } = req.params;
    const { propertyIdx } = req.body;

    try {
        const game = Game.findOne({code});
        const playerIdx = game.players.findIndex(p => p.userId._id.toString() === userId.toString());
        const player = game.players[playerIdx];
        const property = game.boardState[propertyIdx];
        game.boardState[propertyIdx].houses -= 1;
        player.money += property.hCost / 2;

        await game.save();
        const socket = getSocket(userId);
        socket.to(code).emit("sold-house", {game});
        res.status(200).json({message: "House sold successfully", game});

    } catch (error) {
        console.log(error);
        res.status(500).json({message: "Internal Server Error"});
    }
};
export const getLoan = async (req, res) => {
    const userId = req.user._id;
    const { code } = req.params;
    const { loanAmt } = req.body;

    const game = await Game.findOne({code});
    const playerIdx = game.players.findIndex(p => p.userId._id.toString() === userId.toString());
    const player = game.players[playerIdx];
    
    player.money += loanAmt;
    player.loanTaken = true;
    player.loanInterest = 10;

    await game.save();
}
// export const voiceOffer = (req, res) => {
//     const userId = req.user._id;
//     const { targetId, offer } = req.body;
//     const socket = getSocket(userId);
//     try {
//         io.to(targetId).emit("offer", {fromId: socket.id, offer});
//         return res.status(200).json({message: "voice-offer emitted successfuly"});
//     } catch (error) {
//         console.log(error);
//         res.status(500).json({message: "Internal Server Error"});
//     }
// }
// export const voiceAnswer = (req, res) => {
//     const userId = req.user._id;
//     const { targetId, answer } = req.body;
//     const socket = getSocket(userId);
//     try {
//         io.to(targetId).emit("answer", {fromId: socket.id, answer});
//         return res.status(200).json({message: "voice-offer emitted successfuly"});
//     } catch (error) {
//         console.log(error);
//         res.status(500).json({message: "Internal Server Error"});
//     }
// }
// export const voiceCandidate = (req, res) => {
//     const userId = req.user._id;
//     const { targetId, candidate } = req.body;
//     const socket = getSocket(userId);
//     try {
//         io.to(targetId).emit("ice-candidate", {fromId: socket.id, candidate});
//         return res.status(200).json({message: "voice-candidate emitted successfuly"});
//     } catch (error) {
//         console.log(error);
//         res.status(500).json({message: "Internal Server Error"});
//     }
// }