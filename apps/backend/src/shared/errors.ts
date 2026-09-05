export class NotFoundError extends Error {
  constructor(resource: string, id: number | string) {
    super(`${resource} with id ${id} not found`);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "Missing or invalid API token") {
    super(message);
    this.name = "UnauthorizedError";
  }
}
