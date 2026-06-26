const { SPACES, COLOR_GROUPS, RAILWAYS, UTILITIES, getSpaceById, getColorGroup } = require('./board-data');
const { CHANCE_CARDS, COMMUNITY_CHEST_CARDS } = require('./cards');
const { getPlayer, getActivePlayers, ownsFullColorGroup, countOwnedRailways, nextActiveSeat, addLog } = require('./state');

// ─── Public API ──────────────────────────────────────────────────────────────

function applyMove(state, action) {
  const s = structuredClone(state);
  s.lastCard = null;     // cleared each action; drawCard sets it for exactly one broadcast
  s._nearestCard = null; // cleared so Chance nearest-card 2× multiplier doesn't leak
  validateTurn(s, action);
  switch (action.type) {
    case 'ROLL_DICE':          return handleRollDice(s, action);
    case 'PAY_BAIL':           return handlePayBail(s, action);
    case 'USE_JAIL_FREE_CARD': return handleJailFreeCard(s, action);
    case 'BUY_PROPERTY':       return handleBuyProperty(s, action);
    case 'DECLINE_PROPERTY':   return handleDeclineProperty(s, action);
    case 'AUCTION_BID':        return handleAuctionBid(s, action);
    case 'AUCTION_PASS':       return handleAuctionPass(s, action);
    case 'BUILD_HOUSE':        return handleBuildHouse(s, action);
    case 'SELL_HOUSE':         return handleSellHouse(s, action);
    case 'MORTGAGE':           return handleMortgage(s, action);
    case 'UNMORTGAGE':         return handleUnmortgage(s, action);
    case 'OFFER_TRADE':        return handleOfferTrade(s, action);
    case 'ACCEPT_TRADE':       return handleAcceptTrade(s, action);
    case 'REJECT_TRADE':       return handleRejectTrade(s, action);
    case 'CANCEL_TRADE':       return handleCancelTrade(s, action);
    case 'END_TURN':           return handleEndTurn(s, action);
    case 'DECLARE_BANKRUPTCY': return handleDeclareBankruptcy(s, action);
    case 'LEAVE_GAME':         return handleLeaveGame(s, action);
    case 'TIMEOUT':            return handleTimeout(s, action);
    default: throw new Error(`Unknown action: ${action.type}`);
  }
}

// ─── Validation ──────────────────────────────────────────────────────────────

function validateTurn(state, action) {
  // TIMEOUT and AUCTION actions can come from server (no seat check)
  if (['AUCTION_BID', 'AUCTION_PASS'].includes(action.type)) return;
  if (action.type === 'TIMEOUT') {
    if (action.seat !== state.currentTurnSeat) throw new Error('stale_timeout');
    return;
  }
  // ACCEPT/REJECT trade: trade target, not current player
  if (['ACCEPT_TRADE', 'REJECT_TRADE'].includes(action.type)) {
    if (state.pendingTrade?.targetSeat !== action.seat) throw new Error('not_your_trade');
    return;
  }
  // LEAVE_GAME: any active player can leave at any time, not just on their turn
  if (action.type === 'LEAVE_GAME') {
    if (state.status !== 'active') throw new Error('game_not_active');
    const player = state.players.find(p => p.seat === action.seat);
    if (!player) throw new Error('player_not_found');
    return;
  }
  if (action.seat !== state.currentTurnSeat) throw new Error('not_your_turn');
  if (state.status !== 'active') throw new Error('game_not_active');
}

// ─── ROLL_DICE ────────────────────────────────────────────────────────────────

function handleRollDice(state, action) {
  const [d1, d2] = action.dice;
  const player = getPlayer(state, action.seat);

  if (state.phase !== 'roll') throw new Error('invalid_phase');

  // In-jail roll: attempt to escape with doubles
  if (player.inJail) return handleJailRoll(state, player, d1, d2);

  const isDoubles = d1 === d2;
  if (isDoubles) {
    state.doublesCount += 1;
    if (state.doublesCount >= 3) return sendToJail(state, player);
  } else {
    state.doublesCount = 0;
  }

  state.lastDice = [d1, d2];
  const newPos = (player.position + d1 + d2) % 40;
  if (newPos < player.position + d1 + d2 - 39) {
    // wrapped — passed GO
    player.balance += 200;
    addLog(state, `${player.displayName} passed GO, collected M200`);
  }
  player.position = newPos;

  return resolveLanding(state, player);
}

function handleJailRoll(state, player, d1, d2) {
  state.lastDice = [d1, d2];
  if (d1 === d2) {
    // escape by doubles
    player.inJail = false;
    player.jailTurns = 0;
    state.doublesCount = 0; // doubles used to escape don't give extra turn
    const newPos = (player.position + d1 + d2) % 40;
    player.position = newPos;
    addLog(state, `${player.displayName} rolled doubles and escaped jail`);
    return resolveLanding(state, player);
  }
  player.jailTurns += 1;
  if (player.jailTurns >= 3) {
    // 3 failed rolls — forced bail
    if (player.balance < 50) throw new Error('cannot_afford_bail');
    player.balance -= 50;
    addFreeParking(state, 50);
    player.inJail = false;
    player.jailTurns = 0;
    const newPos = (10 + d1 + d2) % 40;
    player.position = newPos;
    addLog(state, `${player.displayName} paid forced bail and moved`);
    return resolveLanding(state, player);
  }
  addLog(state, `${player.displayName} failed to roll doubles in jail (turn ${player.jailTurns})`);
  // Turn ends (no doubles = no extra roll, no move)
  return advanceTurn(state);
}

// ─── Landing resolution ───────────────────────────────────────────────────────

function resolveLanding(state, player) {
  const space = SPACES[player.position];
  addLog(state, `${player.displayName} landed on ${space.name}`);

  switch (space.type) {
    case 'go':
      player.balance += 200; // landing ON go also awards salary
      addLog(state, `${player.displayName} landed on GO, collected M200`);
      return setManage(state);

    case 'go_to_jail':
      return sendToJail(state, player);

    case 'jail':
      return setManage(state);

    case 'free_parking':
      if (state.settings?.freeParkingMoney && state.freeParkingPool > 0) {
        const payout = state.freeParkingPool;
        player.balance += payout;
        state.freeParkingPool = 0;
        addLog(state, `${player.displayName} collected M${payout} from Free Parking`);
      }
      return setManage(state);

    case 'tax':
      player.balance -= space.amount;
      addFreeParking(state, space.amount);
      addLog(state, `${player.displayName} paid ${space.name} M${space.amount}`);
      return setManage(state);

    case 'chance':
      return drawCard(state, player, 'chance');

    case 'community_chest':
      return drawCard(state, player, 'community_chest');

    case 'property':
    case 'railway':
    case 'utility': {
      const propState = state.properties[space.id];
      if (!propState) return setManage(state);
      if (propState.owner === null) {
        state.phase = 'post_roll';
        return state;
      }
      if (propState.owner === player.seat || propState.mortgaged) {
        return setManage(state);
      }
      // owned by another player — charge rent
      const rent = calcRent(state, space, player);
      chargeRent(state, player, getPlayer(state, propState.owner), rent);
      return setManage(state);
    }

    default:
      return setManage(state);
  }
}

// ─── Rent calculation ────────────────────────────────────────────────────────

function calcRent(state, space, landingPlayer) {
  const propState = state.properties[space.id];
  if (space.type === 'railway') {
    const count = countOwnedRailways(state, propState.owner);
    const base = 25 * Math.pow(2, count - 1);
    // Chance "advance to nearest railway" card doubles rent
    return state._nearestCard === 'railway' ? base * 2 : base;
  }
  if (space.type === 'utility') {
    const diceSum = state.lastDice[0] + state.lastDice[1];
    // Chance "advance to nearest utility" card always uses 10× dice
    if (state._nearestCard === 'utility') return diceSum * 10;
    const utilitiesOwned = UTILITIES.filter(id => state.properties[id]?.owner === propState.owner).length;
    return utilitiesOwned === 2 ? diceSum * 10 : diceSum * 4;
  }
  // Regular property
  const houses = propState.houses;
  if (houses > 0) {
    // rent[0]=base, rent[1]=1H, ..., rent[5]=hotel
    return space.rent[Math.min(houses, 5)];
  }
  // No houses: check for monopoly (2x base)
  const color = space.color;
  if (ownsFullColorGroup(state, propState.owner, color)) {
    return space.rent[0] * 2;
  }
  return space.rent[0];
}

function chargeRent(state, payer, receiver, amount) {
  const actual = Math.min(amount, payer.balance);
  payer.balance -= actual;
  receiver.balance += actual;
  addLog(state, `${payer.displayName} paid M${actual} rent to ${receiver.displayName}`);
  if (payer.balance <= 0) {
    addLog(state, `${payer.displayName} is insolvent after rent payment`);
  }
}

// ─── Card drawing ────────────────────────────────────────────────────────────

function drawCard(state, player, deckType) {
  const isDeckChance = deckType === 'chance';
  const deck = isDeckChance ? state.chanceDeck : state.communityDeck;
  const cards = isDeckChance ? CHANCE_CARDS : COMMUNITY_CHEST_CARDS;

  if (deck.length === 0) {
    // reshuffle
    const newDeck = Array.from({ length: cards.length }, (_, i) => i);
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    if (isDeckChance) state.chanceDeck = newDeck;
    else state.communityDeck = newDeck;
  }

  const deckRef = isDeckChance ? state.chanceDeck : state.communityDeck;
  const cardIndex = deckRef.shift();
  const card = cards[cardIndex];

  if (card.effect !== 'JAIL_FREE') {
    if (isDeckChance) state.chanceDeck.push(cardIndex);
    else state.communityDeck.push(cardIndex);
  }

  state.lastCard = { ...card, deck: deckType };
  state.cardSeq = (state.cardSeq || 0) + 1;
  addLog(state, `${player.displayName} drew: ${card.description}`);
  return applyCardEffect(state, player, card);
}

function applyCardEffect(state, player, card) {
  const [effectType, ...params] = card.effect.split(':');

  switch (effectType) {
    case 'COLLECT':
      player.balance += parseInt(params[0]);
      return setManage(state);

    case 'PAY':
      player.balance -= parseInt(params[0]);
      addFreeParking(state, parseInt(params[0]));
      return setManage(state);

    case 'COLLECT_EACH': {
      const amount = parseInt(params[0]);
      getActivePlayers(state).forEach(p => {
        if (p.seat !== player.seat) {
          p.balance -= amount;
          player.balance += amount;
        }
      });
      return setManage(state);
    }

    case 'PAY_EACH': {
      const amount = parseInt(params[0]);
      getActivePlayers(state).forEach(p => {
        if (p.seat !== player.seat) {
          player.balance -= amount;
          p.balance += amount;
        }
      });
      return setManage(state);
    }

    case 'MOVE_TO': {
      const targetPos = parseInt(params[0]);
      // Pay GO salary only when wrapping past it (not when landing on it —
      // resolveLanding's 'go' case awards M200 in that case to avoid double-pay).
      if (targetPos < player.position && targetPos !== 0) {
        player.balance += 200;
      }
      player.position = targetPos;
      return resolveLanding(state, player);
    }

    case 'MOVE_BACK': {
      player.position = (player.position - parseInt(params[0]) + 40) % 40;
      return resolveLanding(state, player);
    }

    case 'MOVE_TO_NEAREST': {
      const type = params[0];
      const nearest = findNearest(player.position, type);
      if (nearest < player.position) player.balance += 200; // passed GO
      player.position = nearest;
      // mark as "nearest" for 2x rent calculation
      state._nearestCard = type;
      return resolveLanding(state, player);
    }

    case 'GO_TO_JAIL':
      return sendToJail(state, player);

    case 'JAIL_FREE':
      player.jailFreeCards += 1;
      return setManage(state);

    case 'STREET_REPAIRS': {
      const houseCost = parseInt(params[0]);
      const hotelCost = parseInt(params[1]);
      let total = 0;
      Object.entries(state.properties).forEach(([id, ps]) => {
        if (ps.owner === player.seat && ps.houses > 0) {
          total += ps.houses === 5 ? hotelCost : ps.houses * houseCost;
        }
      });
      player.balance -= total;
      addFreeParking(state, total);
      return setManage(state);
    }

    default:
      return setManage(state);
  }
}

// ─── Jail actions ─────────────────────────────────────────────────────────────

function handlePayBail(state, action) {
  if (state.phase !== 'roll') throw new Error('invalid_phase');
  const player = getPlayer(state, action.seat);
  if (!player.inJail) throw new Error('not_in_jail');
  if (player.balance < 50) throw new Error('cannot_afford');
  player.balance -= 50;
  addFreeParking(state, 50);
  player.inJail = false;
  player.jailTurns = 0;
  state.phase = 'roll'; // player now rolls normally
  addLog(state, `${player.displayName} paid M50 bail`);
  return state;
}

function handleJailFreeCard(state, action) {
  if (state.phase !== 'roll') throw new Error('invalid_phase');
  const player = getPlayer(state, action.seat);
  if (!player.inJail) throw new Error('not_in_jail');
  if (player.jailFreeCards < 1) throw new Error('no_jail_free_card');
  player.jailFreeCards -= 1;
  player.inJail = false;
  player.jailTurns = 0;
  state.phase = 'roll';
  addLog(state, `${player.displayName} used Get Out of Jail Free card`);
  return state;
}

// ─── Property purchase ────────────────────────────────────────────────────────

function handleBuyProperty(state, action) {
  if (state.phase !== 'post_roll') throw new Error('invalid_phase');
  const player = getPlayer(state, action.seat);
  const space = SPACES[player.position];
  if (!space || !['property', 'railway', 'utility'].includes(space.type)) throw new Error('not_a_property');
  const propState = state.properties[space.id];
  if (propState.owner !== null) throw new Error('already_owned');
  if (player.balance < space.price) throw new Error('cannot_afford');
  player.balance -= space.price;
  propState.owner = player.seat;
  addLog(state, `${player.displayName} bought ${space.name} for M${space.price}`);
  return setManage(state);
}

function handleDeclineProperty(state, action) {
  if (state.phase !== 'post_roll') throw new Error('invalid_phase');
  const player = getPlayer(state, action.seat);
  const space = SPACES[player.position];
  const propState = state.properties[space.id];
  if (propState.owner !== null) throw new Error('already_owned');
  // Start auction
  state.phase = 'auction';
  state.auction = {
    propertyId: space.id,
    highBid: 0,
    highBidder: null,
    passedSeats: [],
  };
  addLog(state, `${space.name} goes to auction`);
  return state;
}

// ─── Auction ──────────────────────────────────────────────────────────────────

function handleAuctionBid(state, action) {
  if (state.phase !== 'auction') throw new Error('invalid_phase');
  if (!state.auction) throw new Error('no_auction');
  const player = getPlayer(state, action.seat);
  if (player.isBankrupt) throw new Error('bankrupt_player');
  if (action.amount <= state.auction.highBid) throw new Error('bid_too_low');
  if (action.amount > player.balance) throw new Error('cannot_afford');
  state.auction.highBid = action.amount;
  state.auction.highBidder = action.seat;
  // Remove from passed list if they bid after passing
  state.auction.passedSeats = state.auction.passedSeats.filter(s => s !== action.seat);
  addLog(state, `${player.displayName} bids M${action.amount} for ${state.auction.propertyId}`);
  return state;
}

function handleAuctionPass(state, action) {
  if (state.phase !== 'auction') throw new Error('invalid_phase');
  const player = getPlayer(state, action.seat);
  if (!state.auction.passedSeats.includes(action.seat)) {
    state.auction.passedSeats.push(action.seat);
  }
  addLog(state, `${player.displayName} passes auction`);
  return checkAuctionEnd(state);
}

function checkAuctionEnd(state) {
  const active = getActivePlayers(state);
  const allPassed = active.every(p => state.auction.passedSeats.includes(p.seat));
  if (!allPassed) return state;

  // Auction over
  if (state.auction.highBidder !== null) {
    const winner = getPlayer(state, state.auction.highBidder);
    winner.balance -= state.auction.highBid;
    state.properties[state.auction.propertyId].owner = state.auction.highBidder;
    addLog(state, `${winner.displayName} won auction for ${state.auction.propertyId} at M${state.auction.highBid}`);
  } else {
    addLog(state, `${state.auction.propertyId} returned to bank unsold`);
  }
  state.auction = null;
  return setManage(state);
}

// ─── Manage phase ─────────────────────────────────────────────────────────────

function handleBuildHouse(state, action) {
  if (!['manage', 'roll'].includes(state.phase)) throw new Error('invalid_phase');
  if (state.pendingTrade) throw new Error('trade_pending');
  const player = getPlayer(state, action.seat);
  const space = getSpaceById(action.propertyId);
  if (!space || space.type !== 'property') throw new Error('not_a_property');
  const propState = state.properties[action.propertyId];
  if (propState.owner !== action.seat) throw new Error('not_owner');
  if (propState.mortgaged) throw new Error('property_mortgaged');
  if (!ownsFullColorGroup(state, action.seat, space.color)) throw new Error('need_full_color_group');
  if (propState.houses >= 5) throw new Error('max_houses');
  // Even build rule: no property in group can have more than 1 house ahead of others
  const group = COLOR_GROUPS[space.color];
  const minHouses = Math.min(...group.map(id => state.properties[id].houses));
  if (propState.houses > minHouses) throw new Error('even_build_rule');
  if (player.balance < space.houseCost) throw new Error('cannot_afford');
  player.balance -= space.houseCost;
  propState.houses += 1;
  const label = propState.houses === 5 ? 'hotel' : `house #${propState.houses}`;
  addLog(state, `${player.displayName} built ${label} on ${space.name}`);
  return state;
}

function handleSellHouse(state, action) {
  if (!['manage', 'roll'].includes(state.phase)) throw new Error('invalid_phase');
  const player = getPlayer(state, action.seat);
  const space = getSpaceById(action.propertyId);
  const propState = state.properties[action.propertyId];
  if (propState.owner !== action.seat) throw new Error('not_owner');
  if (propState.houses < 1) throw new Error('no_houses');
  // Even sell rule: can't leave another in group with 2 more than this one
  const group = COLOR_GROUPS[space.color];
  const maxHouses = Math.max(...group.map(id => state.properties[id].houses));
  if (maxHouses > propState.houses) throw new Error('even_build_rule');
  propState.houses -= 1;
  player.balance += Math.floor(space.houseCost / 2);
  addLog(state, `${player.displayName} sold a house on ${space.name}`);
  return state;
}

function handleMortgage(state, action) {
  if (!['manage', 'roll'].includes(state.phase)) throw new Error('invalid_phase');
  const player = getPlayer(state, action.seat);
  const space = getSpaceById(action.propertyId);
  if (!space) throw new Error('invalid_property');
  const propState = state.properties[action.propertyId];
  if (propState.owner !== action.seat) throw new Error('not_owner');
  if (propState.mortgaged) throw new Error('already_mortgaged');
  if (propState.houses > 0) throw new Error('sell_houses_first');
  propState.mortgaged = true;
  player.balance += space.mortgage;
  addLog(state, `${player.displayName} mortgaged ${space.name} for M${space.mortgage}`);
  return state;
}

function handleUnmortgage(state, action) {
  if (!['manage', 'roll'].includes(state.phase)) throw new Error('invalid_phase');
  const player = getPlayer(state, action.seat);
  const space = getSpaceById(action.propertyId);
  if (!space) throw new Error('invalid_property');
  const propState = state.properties[action.propertyId];
  if (propState.owner !== action.seat) throw new Error('not_owner');
  if (!propState.mortgaged) throw new Error('not_mortgaged');
  const cost = Math.ceil(space.mortgage * 1.1);
  if (player.balance < cost) throw new Error('cannot_afford');
  propState.mortgaged = false;
  player.balance -= cost;
  addLog(state, `${player.displayName} unmortgaged ${space.name} for M${cost}`);
  return state;
}

function handleEndTurn(state, action) {
  if (state.phase !== 'manage') throw new Error('invalid_phase');
  if (state.pendingTrade) throw new Error('trade_pending');
  return advanceTurn(state);
}

// ─── Trading ──────────────────────────────────────────────────────────────────

function handleOfferTrade(state, action) {
  if (state.phase !== 'manage') throw new Error('invalid_phase');
  if (!state.settings.allowTrading) throw new Error('trading_disabled');
  if (state.pendingTrade) throw new Error('trade_already_pending');
  const { offer } = action; // { targetSeat, offerProperties[], offerCash, requestProperties[], requestCash }
  state.pendingTrade = {
    offerSeat: action.seat,
    targetSeat: offer.targetSeat,
    offerProperties: offer.offerProperties || [],
    offerCash: offer.offerCash || 0,
    requestProperties: offer.requestProperties || [],
    requestCash: offer.requestCash || 0,
  };
  addLog(state, `${getPlayer(state, action.seat).displayName} offered a trade`);
  return state;
}

function handleAcceptTrade(state, action) {
  const trade = state.pendingTrade;
  if (!trade || trade.targetSeat !== action.seat) throw new Error('no_trade_for_you');
  const offerer = getPlayer(state, trade.offerSeat);
  const target = getPlayer(state, trade.targetSeat);
  // Validate ownership
  trade.offerProperties.forEach(id => {
    if (state.properties[id].owner !== trade.offerSeat) throw new Error('trade_invalid_property');
  });
  trade.requestProperties.forEach(id => {
    if (state.properties[id].owner !== trade.targetSeat) throw new Error('trade_invalid_property');
  });
  if (offerer.balance < trade.offerCash) throw new Error('offerer_cannot_afford');
  if (target.balance < trade.requestCash) throw new Error('target_cannot_afford');
  // Execute swap
  trade.offerProperties.forEach(id => { state.properties[id].owner = trade.targetSeat; });
  trade.requestProperties.forEach(id => { state.properties[id].owner = trade.offerSeat; });
  offerer.balance -= trade.offerCash;
  target.balance += trade.offerCash;
  target.balance -= trade.requestCash;
  offerer.balance += trade.requestCash;
  state.pendingTrade = null;
  addLog(state, `Trade accepted between ${offerer.displayName} and ${target.displayName}`);
  return state;
}

function handleRejectTrade(state, action) {
  if (!state.pendingTrade || state.pendingTrade.targetSeat !== action.seat) throw new Error('no_trade_for_you');
  addLog(state, `${getPlayer(state, action.seat).displayName} rejected the trade`);
  state.pendingTrade = null;
  return state;
}

function handleCancelTrade(state, action) {
  if (!state.pendingTrade || state.pendingTrade.offerSeat !== action.seat) throw new Error('not_your_trade');
  addLog(state, `${getPlayer(state, action.seat).displayName} cancelled the trade offer`);
  state.pendingTrade = null;
  return state;
}

// ─── Bankruptcy ───────────────────────────────────────────────────────────────

function handleDeclareBankruptcy(state, action) {
  const player = getPlayer(state, action.seat);
  const creditorSeat = action.creditorSeat ?? null; // null = owed to bank

  player.isBankrupt = true;
  player.balance = 0;

  // Transfer all properties to creditor or back to bank
  Object.entries(state.properties).forEach(([id, ps]) => {
    if (ps.owner === action.seat) {
      if (creditorSeat !== null) {
        ps.owner = creditorSeat;
        ps.mortgaged = false; // transferred properties come unmortgaged
      } else {
        ps.owner = null;
        ps.houses = 0;
        ps.mortgaged = false;
      }
    }
  });

  addLog(state, `${player.displayName} has declared bankruptcy`);

  const remaining = getActivePlayers(state);
  if (remaining.length === 1) {
    state.status = 'finished';
    state.phase = 'finished';
    addLog(state, `${remaining[0].displayName} wins!`);
    return state;
  }

  return advanceTurn(state);
}

// ─── Leave Game ──────────────────────────────────────────────────────────────

function handleLeaveGame(state, action) {
  const player = state.players.find(p => p.seat === action.seat);
  if (!player || player.isBankrupt) return state; // already gone

  player.isBankrupt = true;
  player.balance = 0;
  player.leftAt = new Date().toISOString();

  // Return all properties to bank (not to a creditor)
  Object.entries(state.properties).forEach(([, ps]) => {
    if (ps.owner === action.seat) {
      ps.owner = null;
      ps.houses = 0;
      ps.mortgaged = false;
    }
  });

  addLog(state, `${player.displayName} left the game`);

  const remaining = getActivePlayers(state);
  if (remaining.length === 1) {
    state.status = 'finished';
    state.phase = 'finished';
    addLog(state, `${remaining[0].displayName} wins!`);
    return state;
  }

  // If it was this player's turn, advance to the next
  if (state.currentTurnSeat === action.seat) {
    state.doublesCount = 0;
    state.pendingTrade = null;
    return advanceTurn(state);
  }

  // Cancel any pending trade this player was party to
  if (state.pendingTrade &&
      (state.pendingTrade.fromSeat === action.seat || state.pendingTrade.targetSeat === action.seat)) {
    state.pendingTrade = null;
  }

  return state;
}

// ─── Timeout (server-triggered) ───────────────────────────────────────────────

function handleTimeout(state, action) {
  const player = getPlayer(state, state.currentTurnSeat);
  addLog(state, `${player?.displayName ?? 'Player'} timed out`);

  if (state.phase === 'post_roll') {
    return handleDeclineProperty(state, { seat: state.currentTurnSeat });
  }
  if (state.phase === 'auction') {
    return handleAuctionPass(state, { seat: state.currentTurnSeat });
  }

  state.doublesCount = 0;
  state.pendingTrade = null;
  return advanceTurn(state);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function advanceTurn(state) {
  // If player rolled doubles and is not in jail, they get another roll
  if (state.doublesCount > 0 && !getPlayer(state, state.currentTurnSeat)?.inJail) {
    state.phase = 'roll';
    return state;
  }
  state.doublesCount = 0;
  state.currentTurnSeat = nextActiveSeat(state, state.currentTurnSeat);
  state.phase = 'roll';
  state.pendingTrade = null;
  return state;
}

function setManage(state) {
  state.phase = 'manage';
  return state;
}

function sendToJail(state, player) {
  player.position = 10;
  player.inJail = true;
  player.jailTurns = 0;
  state.doublesCount = 0;
  addLog(state, `${player.displayName} was sent to Jail`);
  return advanceTurn(state);
}

function addFreeParking(state, amount) {
  if (state.settings?.freeParkingMoney) {
    state.freeParkingPool += amount;
  }
}

function findNearest(currentPos, type) {
  const positions = type === 'railway'
    ? RAILWAYS.map(id => SPACES.find(s => s.id === id).pos)
    : UTILITIES.map(id => SPACES.find(s => s.id === id).pos);

  let nearest = null;
  let minDist = 41;
  positions.forEach(pos => {
    const dist = (pos - currentPos + 40) % 40;
    if (dist > 0 && dist < minDist) { minDist = dist; nearest = pos; }
  });
  return nearest;
}

module.exports = { applyMove };
