import { chanceCards, communityCards } from "./data.js";

export const handleLandedOn = (game, playerIndex, userId) => {
    const player = game.players[playerIndex];
    const space = game.boardState[player.position];
    console.log("landed on", space.name);
    
    if (space.tax) {
        player.money -= space.amt;
        return {event: "landed-tax", space: space};
    }
    if (space.property || space.station || space.utility){
        if (!space.owned) return { event: "landed-unowned-prop", space: space };
        else if (space.owner._id.toString() === userId.toString()) {
            const canBuildHouse = checkBuildHouse(player, space);
            console.log("can build a house");
            return {event: "landed-your-prop", space: space, canBuildHouse};
        } else {
            return { event:"landed-owned-prop", space: space };
        }
    }
    if (space.chance){
        const card = drawRandomCard(chanceCards);
        if (card.destination){
            movePlayerTo(player, destination);
        }else if (card.amt){
            player.money += card.amt;
        }
        return {event: "landed-chance", card}
    }
    if (space.comm){
        const card = drawRandomCard(communityCards);
        player.money += card.amt;
        return {event: "landed-community", card};
    }
}
const checkBuildHouse = (player, property) => {
    if (property.property && property.houses <= 4) 
        return player.properties.every(p => property.setPairIndices.includes(p));
    else return false;
}
const drawRandomCard = (cardArray) => {
    const card = cardArray[Math.floor(Math.random()*cardArray.length)];
    return card;
}
const movePlayerTo = (player, destination) => {
    if (player.position > destination && destination != 10){
        player.money += 2000;
    }   
    player.position = destination;
}