class SignupError extends Error {
  constructor(message) {
    super(message);
    this.name = "SingupError";
  }
}
