class ChatMessage {
  constructor(user, message) {
    this.user = user;
    this.message = message;
    this.timestamp = new Date(Date.now()).getTime();
  }

  toJSON() {
    return {
      message: `[${this.timestamp}] ${this.user.username}: ${this.message}`
    };
  }
}

export default ChatMessage;
