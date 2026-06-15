const { SPACES, COLOR_GROUPS, RAILWAYS, UTILITIES, getSpaceById } = require('./board-data');
const { getPlayer, ownsFullColorGroup, getActivePlayers } = require('./state');

function rollDie() {
  return Math.ceil(Math.random() * 6);
}

function getBotAction(state, seat) {
  const player = getPlayer(state, seat);
  if (!player) return { type: 'END_TURN', seat };

  const difficulty = player.botDifficulty || state.settings?.botDifficulty || 'medium';

  switch (state.phase) {
    case 'roll':
      return { type: 'ROLL_DICE', seat, dice: [rollDie(), rollDie()] };

    case 'post_roll': {
      const space = SPACES[player.position];
      if (!space || !state.properties[space.id]) return { type: 'END_TURN', seat };
      const propState = state.properties[space.id];
      if (propState.owner !== null) return { type: 'END_TURN', seat };

      return handlePostRoll(state, player, space, difficulty);
    }

    case 'auction': {
      if (!state.auction) return { type: 'END_TURN', seat };
      return handleAuction(state, player, difficulty);
    }

    case 'manage': {
      // Reject any pending trade
      if (state.pendingTrade?.targetSeat === seat) {
        return { type: 'REJECT_TRADE', seat };
      }

      // If in debt, try to raise cash or declare bankruptcy
      if (player.balance < 0) {
        return handleDebt(state, player, difficulty);
      }

      // If not in debt, try to build houses or unmortgage properties
      const manageAction = handleManagement(state, player, difficulty);
      if (manageAction) return manageAction;

      return { type: 'END_TURN', seat };
    }

    default:
      return { type: 'END_TURN', seat };
  }
}

function handlePostRoll(state, player, space, difficulty) {
  const seat = player.seat;
  if (player.balance < space.price) {
    return { type: 'DECLINE_PROPERTY', seat };
  }

  if (difficulty === 'easy') {
    return Math.random() < 0.5
      ? { type: 'BUY_PROPERTY', seat }
      : { type: 'DECLINE_PROPERTY', seat };
  }

  if (difficulty === 'medium') {
    return player.balance - space.price >= 100
      ? { type: 'BUY_PROPERTY', seat }
      : { type: 'DECLINE_PROPERTY', seat };
  }

  // Hard difficulty
  const isHighValue = ['orange', 'red', 'yellow', 'green', 'dark_blue'].includes(space.color) || 
                      space.type === 'railway' || 
                      space.type === 'utility';

  if (isHighValue) {
    return { type: 'BUY_PROPERTY', seat };
  }

  // Check if we own any other property in the group
  const color = space.color;
  const group = COLOR_GROUPS[color] || [];
  const ownsAnyInGroup = group.some(id => state.properties[id]?.owner === seat);

  if (ownsAnyInGroup || player.balance - space.price >= 200) {
    return { type: 'BUY_PROPERTY', seat };
  }

  return { type: 'DECLINE_PROPERTY', seat };
}

function handleAuction(state, player, difficulty) {
  const seat = player.seat;
  const { propertyId, highBid } = state.auction;
  const space = getSpaceById(propertyId);
  if (!space) return { type: 'AUCTION_PASS', seat };

  if (difficulty === 'easy') {
    if (Math.random() < 0.15 && player.balance > highBid + 10) {
      return { type: 'AUCTION_BID', seat, amount: highBid + 10 };
    }
    return { type: 'AUCTION_PASS', seat };
  }

  if (difficulty === 'medium') {
    if (highBid < space.price * 0.5 && player.balance > highBid + 10) {
      return { type: 'AUCTION_BID', seat, amount: highBid + 10 };
    }
    return { type: 'AUCTION_PASS', seat };
  }

  // Hard difficulty
  const isHighValue = ['orange', 'red', 'yellow', 'green', 'dark_blue'].includes(space.color) || 
                      space.type === 'railway' || 
                      space.type === 'utility';

  const group = COLOR_GROUPS[space.color] || [];
  const completesMonopoly = group.length > 0 && group.every(id => id === propertyId || state.properties[id]?.owner === seat);

  const maxBid = (isHighValue || completesMonopoly) ? space.price * 1.2 : space.price * 0.8;

  if (highBid < maxBid && player.balance > highBid + 10) {
    return { type: 'AUCTION_BID', seat, amount: Math.ceil(highBid + 10) };
  }

  return { type: 'AUCTION_PASS', seat };
}

function handleDebt(state, player, difficulty) {
  const seat = player.seat;

  // 1. Try to sell houses
  const propertiesWithHouses = Object.entries(state.properties)
    .filter(([id, prop]) => prop.owner === seat && prop.houses > 0)
    .map(([id, prop]) => ({ id, ...prop, space: getSpaceById(id) }));

  if (propertiesWithHouses.length > 0) {
    let targetProperty;
    if (difficulty === 'easy') {
      targetProperty = propertiesWithHouses[Math.floor(Math.random() * propertiesWithHouses.length)];
    } else {
      // Sort by house cost ascending
      propertiesWithHouses.sort((a, b) => (a.space?.houseCost || 0) - (b.space?.houseCost || 0));
      targetProperty = propertiesWithHouses[0];
    }
    return { type: 'SELL_HOUSE', seat, propertyId: targetProperty.id };
  }

  // 2. Try to mortgage properties
  const mortgagableProperties = Object.entries(state.properties)
    .filter(([id, prop]) => prop.owner === seat && !prop.mortgaged)
    .map(([id, prop]) => ({ id, ...prop, space: getSpaceById(id) }));

  if (mortgagableProperties.length > 0) {
    let targetProperty;
    if (difficulty === 'easy') {
      targetProperty = mortgagableProperties[Math.floor(Math.random() * mortgagableProperties.length)];
    } else if (difficulty === 'medium') {
      // Sort by mortgage value ascending
      mortgagableProperties.sort((a, b) => (a.space?.mortgage || 0) - (b.space?.mortgage || 0));
      targetProperty = mortgagableProperties[0];
    } else {
      // Hard: avoid mortgaging monopoly properties if possible
      mortgagableProperties.sort((a, b) => {
        const aMonopoly = ownsFullColorGroup(state, seat, a.space?.color);
        const bMonopoly = ownsFullColorGroup(state, seat, b.space?.color);
        if (aMonopoly && !bMonopoly) return 1;
        if (!aMonopoly && bMonopoly) return -1;
        return (a.space?.mortgage || 0) - (b.space?.mortgage || 0);
      });
      targetProperty = mortgagableProperties[0];
    }
    return { type: 'MORTGAGE', seat, propertyId: targetProperty.id };
  }

  // 3. Declare bankruptcy
  return { type: 'DECLARE_BANKRUPTCY', seat, creditorSeat: null };
}

function handleManagement(state, player, difficulty) {
  const seat = player.seat;

  // Find build targets
  const buildTargets = [];
  for (const [color, ids] of Object.entries(COLOR_GROUPS)) {
    if (!ownsFullColorGroup(state, seat, color)) continue;
    
    const hasMortgaged = ids.some(id => state.properties[id]?.mortgaged);
    if (hasMortgaged) continue;

    const minHouses = Math.min(...ids.map(id => state.properties[id]?.houses || 0));

    ids.forEach(id => {
      const prop = state.properties[id];
      const space = getSpaceById(id);
      if (prop && prop.houses < 5 && prop.houses === minHouses) {
        buildTargets.push({ id, ...prop, space });
      }
    });
  }

  // Find mortgaged properties
  const mortgagedProperties = Object.entries(state.properties)
    .filter(([id, prop]) => prop.owner === seat && prop.mortgaged)
    .map(([id, prop]) => ({ id, ...prop, space: getSpaceById(id) }));

  if (difficulty === 'easy') {
    if (buildTargets.length > 0 && player.balance > 400 && Math.random() < 0.3) {
      const target = buildTargets[Math.floor(Math.random() * buildTargets.length)];
      if (player.balance >= target.space.houseCost) {
        return { type: 'BUILD_HOUSE', seat, propertyId: target.id };
      }
    }
    return null;
  }

  if (difficulty === 'medium') {
    if (buildTargets.length > 0 && player.balance > 300) {
      buildTargets.sort((a, b) => a.houses - b.houses);
      const target = buildTargets[0];
      if (player.balance >= target.space.houseCost) {
        return { type: 'BUILD_HOUSE', seat, propertyId: target.id };
      }
    }

    if (mortgagedProperties.length > 0 && player.balance > 500) {
      const target = mortgagedProperties[Math.floor(Math.random() * mortgagedProperties.length)];
      const cost = Math.ceil((target.space?.mortgage || 0) * 1.1);
      if (player.balance >= cost) {
        return { type: 'UNMORTGAGE', seat, propertyId: target.id };
      }
    }

    return null;
  }

  // Hard difficulty
  if (buildTargets.length > 0 && player.balance > 200) {
    const colorPriority = {
      dark_blue: 8,
      green: 7,
      yellow: 6,
      red: 5,
      orange: 4,
      pink: 3,
      light_blue: 2,
      brown: 1
    };
    buildTargets.sort((a, b) => {
      const priorityA = colorPriority[a.space?.color] || 0;
      const priorityB = colorPriority[b.space?.color] || 0;
      if (priorityA !== priorityB) return priorityB - priorityA;
      return a.houses - b.houses;
    });

    const target = buildTargets[0];
    if (player.balance >= target.space.houseCost) {
      return { type: 'BUILD_HOUSE', seat, propertyId: target.id };
    }
  }

  if (mortgagedProperties.length > 0 && player.balance > 400) {
    mortgagedProperties.sort((a, b) => {
      const colorA = a.space?.color;
      const groupA = COLOR_GROUPS[colorA] || [];
      const completingA = groupA.every(id => id === a.id || state.properties[id]?.owner === seat && !state.properties[id]?.mortgaged);

      const colorB = b.space?.color;
      const groupB = COLOR_GROUPS[colorB] || [];
      const completingB = groupB.every(id => id === b.id || state.properties[id]?.owner === seat && !state.properties[id]?.mortgaged);

      if (completingA && !completingB) return -1;
      if (!completingA && completingB) return 1;

      return (b.space?.mortgage || 0) - (a.space?.mortgage || 0);
    });

    const target = mortgagedProperties[0];
    const cost = Math.ceil((target.space?.mortgage || 0) * 1.1);
    if (player.balance >= cost) {
      return { type: 'UNMORTGAGE', seat, propertyId: target.id };
    }
  }

  return null;
}

module.exports = { getBotAction };
