// effect string format:
//   'COLLECT:n'        — player collects n from bank
//   'PAY:n'            — player pays n to bank (goes to free parking pool if enabled)
//   'PAY_EACH:n'       — player pays n to each other active player
//   'COLLECT_EACH:n'   — player collects n from each other active player
//   'MOVE_TO:pos'      — move player to board position pos (collect GO if passing)
//   'MOVE_TO_NEAREST:railway' — advance to nearest railway, pay 2x rent
//   'MOVE_TO_NEAREST:utility' — advance to nearest utility, pay 10x dice
//   'MOVE_BACK:n'      — move back n spaces (no GO collection)
//   'GO_TO_JAIL'       — go to jail immediately
//   'JAIL_FREE'        — get out of jail free card (keep until used)
//   'STREET_REPAIRS:h:H' — pay h per house, H per hotel owned

const CHANCE_CARDS = [
  { id: 'ch_advance_go',      description: 'Advance to GO. Collect M200.',              effect: 'MOVE_TO:0'              },
  { id: 'ch_advance_goa',     description: 'Advance to Panaji (Goa).',                  effect: 'MOVE_TO:6'              },
  { id: 'ch_advance_mumbai',  description: 'Advance to Mumbai.',                         effect: 'MOVE_TO:39'             },
  { id: 'ch_advance_nearest_railway_1', description: 'Advance to nearest Railway. Pay owner twice the usual rent.', effect: 'MOVE_TO_NEAREST:railway' },
  { id: 'ch_advance_nearest_railway_2', description: 'Advance to nearest Railway. Pay owner twice the usual rent.', effect: 'MOVE_TO_NEAREST:railway' },
  { id: 'ch_advance_nearest_utility',   description: 'Advance to nearest Utility. If unowned you may buy. If owned pay owner 10x dice roll.', effect: 'MOVE_TO_NEAREST:utility' },
  { id: 'ch_bank_dividend',   description: 'Bank pays you a dividend of M50.',           effect: 'COLLECT:50'             },
  { id: 'ch_jail_free',       description: 'Get Out of Jail Free.',                      effect: 'JAIL_FREE'              },
  { id: 'ch_go_back_3',       description: 'Go back 3 spaces.',                          effect: 'MOVE_BACK:3'            },
  { id: 'ch_go_to_jail',      description: 'Go to Jail.',                                effect: 'GO_TO_JAIL'             },
  { id: 'ch_street_repairs',  description: 'Make general repairs: pay M25 per house, M100 per hotel.', effect: 'STREET_REPAIRS:25:100' },
  { id: 'ch_poor_tax',        description: 'Pay poor tax of M15.',                       effect: 'PAY:15'                 },
  { id: 'ch_advance_delhi',   description: 'Take a trip to New Delhi Railway Station.',  effect: 'MOVE_TO:25'             },
  { id: 'ch_advance_bengaluru', description: 'Advance to Bengaluru.',                    effect: 'MOVE_TO:34'             },
  { id: 'ch_elected_chairman', description: 'You have been elected Chairman of the Board. Pay each player M50.', effect: 'PAY_EACH:50' },
  { id: 'ch_investment',      description: 'Your building loan matures. Collect M150.',  effect: 'COLLECT:150'            },
];

const COMMUNITY_CHEST_CARDS = [
  { id: 'cc_advance_go',      description: 'Advance to GO. Collect M200.',              effect: 'MOVE_TO:0'              },
  { id: 'cc_bank_error',      description: 'Bank error in your favour. Collect M200.',  effect: 'COLLECT:200'            },
  { id: 'cc_doctor_fee',      description: "Doctor's fees. Pay M50.",                    effect: 'PAY:50'                 },
  { id: 'cc_stock_sale',      description: 'From sale of stock you get M50.',           effect: 'COLLECT:50'             },
  { id: 'cc_jail_free',       description: 'Get Out of Jail Free.',                      effect: 'JAIL_FREE'              },
  { id: 'cc_go_to_jail',      description: 'Go to Jail.',                                effect: 'GO_TO_JAIL'             },
  { id: 'cc_grand_opera',     description: 'Grand Opera Night. Collect M50 from each player.', effect: 'COLLECT_EACH:50'  },
  { id: 'cc_holiday_fund',    description: 'Holiday fund matures. Receive M100.',       effect: 'COLLECT:100'            },
  { id: 'cc_income_tax',      description: 'Income tax refund. Collect M20.',           effect: 'COLLECT:20'             },
  { id: 'cc_birthday',        description: "It is your birthday. Collect M10 from each player.", effect: 'COLLECT_EACH:10' },
  { id: 'cc_life_insurance',  description: 'Life insurance matures. Collect M100.',     effect: 'COLLECT:100'            },
  { id: 'cc_hospital_fee',    description: 'Pay hospital fees of M100.',                effect: 'PAY:100'                },
  { id: 'cc_school_fees',     description: 'Pay school fees of M50.',                   effect: 'PAY:50'                 },
  { id: 'cc_consultancy',     description: 'Receive M25 consultancy fee.',              effect: 'COLLECT:25'             },
  { id: 'cc_street_repairs',  description: 'You are assessed for street repairs: M40 per house, M115 per hotel.', effect: 'STREET_REPAIRS:40:115' },
  { id: 'cc_beauty_contest',  description: 'You have won second prize in a beauty contest. Collect M10.', effect: 'COLLECT:10' },
];

module.exports = { CHANCE_CARDS, COMMUNITY_CHEST_CARDS };
