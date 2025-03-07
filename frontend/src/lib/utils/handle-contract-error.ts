import {
  CONTRACT_ERRORS,
  ContractError,
  type ContractErrorType,
} from '@/src/lib/errors/contract-errors';

interface ErrorMapping {
  InvalidPremium?: string;
  InvalidStrike?: string;
  InvalidToken?: string;
  NotAllOptionsExpired?: string;
  NotDepositor?: string;
  OptionExpired?: string;
  OptionNotAvailable?: string;
  OptionOutOfWindow?: string;
  OptionNotPurchased?: string;
  PositionAlreadyUsed?: string;
  PositionDoesNotExist?: string;
  WrongPremiumAmount?: string;
}

export function handleContractError(
  error: unknown,
  errorMessages: ErrorMapping = {},
  defaultMessage = 'Contract error occurred',
): never {
  console.log('error', error);
  if (error instanceof Error) {
    const errorName = error.message
      .split('(')?.[0]
      ?.trim() as ContractErrorType;

    if (errorName in CONTRACT_ERRORS) {
      throw new ContractError(
        errorMessages[errorName] || defaultMessage,
        error,
      );
    }

    if (error.message.includes('User rejected the request')) {
      throw new ContractError('Transaction was rejected by user', error);
    }
  }

  throw new ContractError(
    'Failed to complete transaction. Please check your connection and try again',
    error,
  );
}
