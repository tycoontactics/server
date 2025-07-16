import Game from "../models/game.model.js";

export const checkGame = async (req, res, next) => {
    try {
        const {code} = req.params;
        const game = await Game.findOne({code}).populate("players.userId", "username");
        if (!game)
            return res.status(404).json({message: "Game not found"});
        
        if (game.started)
            return res.status(400).json({message:"Game already started"});

        req.game = game;
        console.log(game.players);
        next();
    } catch (error) {
        console.log("Error in checkGame middleware", error);
        return res.status(500).json({message: "Internal Server Error"});
    }
}
export const checkHost = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const game = req.game;

        if (game.hostId.toString() !== userId.toString())
            return res.status(400).json({message: "Not Room Host"});

        next();
    } catch (error) {
        console.log("Error in checkHost middleware", error);
        return res.status(500).json({message: "Internal Server Error"});
    }
}
export const checkGameJoined = async(req, res, next) => {
    try {
        const userId = req.user._id;
        console.log(userId);
        const {code} = req.params;
        const game = await Game.findOne({code}).populate("players.userId", "username").populate("boardState.owner", "username");

        if (!game)
            return res.status(404).json({message: "Game not found"});
        
        // console.log(game.players);
        if (game.started && !game.players.some(user => user.userId._id.toString() === userId.toString()))
            return res.status(400).json({message: "Not member of started game"});

        req.game = game;
        next();
    } catch (error) {
        console.log("Error checking joined game", error);
        return res.status(400).json({message: "Internal Server Error"});
    }
}
export const checkOwner = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { propertyIdx } = req.body;
        const { game } = req.game;

        if (!game)
            return res.status(404).json({message: "Game not found"});
        const playerIdx = game.players.find(p => p.userId._id.toString() === userId.toString());
        const player = game.players[playerIdx];
        if (!player.properties.includes(propertyIdx)){
            return res.status(400).json({message: "Not owner of property"});
        }
        next();
    } catch (error) {
        console.log("Error in check-owned middleware", error);
        return res.status(500).json("Internal Server Error");
    }
}

