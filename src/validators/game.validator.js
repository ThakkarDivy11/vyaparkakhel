// src/validators/game.validator.js
const Joi = require("joi");
const { commonError } = require("../utils/error");

exports.validateCreateGame = (req, res, next) => {
  const schema = Joi.object({
    settings: Joi.object({
      maxPlayers: Joi.number().integer().min(2).max(10).default(4),
      timePerTurnSec: Joi.number().integer().min(10).max(600).default(60),
      mode: Joi.string().valid("classic", "short", "custom", "pass_and_play", "vs_computer").default("classic"),
      allowTrading: Joi.boolean().default(true),
      freeParkingMoney: Joi.number().min(0).max(10000).default(0),
      boardTheme: Joi.string().valid("flat", "3d").default("flat"),
    }).default(),
    playerNames: Joi.array().items(Joi.string().max(30)).max(10).optional(),
  });

  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return next(
      commonError(
        400,
        "ValidationError",
        error.details.map((d) => d.message).join(", ")
      )
    );
  }
  req.validated = value;
  next();
};

exports.validateJoinGame = (req, res, next) => {
  const schema = Joi.object({
    displayName: Joi.string().min(2).max(50).trim().required(),
  });
  const { error, value } = schema.validate(req.body);
  if (error) {
    return next(commonError(400, "ValidationError", error.details[0].message));
  }
  req.validated = value;
  next();
};
