export interface ErrorDetail {
  field: string;
  message: string;
}

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends DomainError {
  constructor(
    message: string,
    readonly details?: ErrorDetail[],
  ) {
    super(message);
  }
}

export class NotFoundError extends DomainError {}

export class ConflictError extends DomainError {}
