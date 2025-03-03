export class ContractError extends Error {
  constructor(
    message: string,
    public cause?: unknown,
  ) {
    super(message);
    this.name = 'ContractError';
  }
}

export const CONTRACT_ERRORS = {
  NotDepositor: 'NotDepositor',
  PositionAlreadyUsed: 'PositionAlreadyUsed',
  PositionDoesNotExist: 'PositionDoesNotExist',
  InvalidToken: 'InvalidToken',
  InvalidStrike: 'InvalidStrike',
  InvalidPremium: 'InvalidPremium',
  OptionNotAvailable: 'OptionNotAvailable',
  OptionExpired: 'OptionExpired',
  OptionOutOfWindow: 'OptionOutOfWindow',
  WrongPremiumAmount: 'WrongPremiumAmount',
  NotAllOptionsExpired: 'NotAllOptionsExpired',
} as const;

export type ContractErrorType = keyof typeof CONTRACT_ERRORS;
