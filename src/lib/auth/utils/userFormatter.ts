export class UserFormatter {
  static shortenUserId(userId: string | undefined): string {
    if (!userId) return "";
    return userId.length > 20
      ? `${userId.slice(0, 8)}...${userId.slice(-8)}`
      : userId;
  }

  static formatUserDisplayName(userInfo: any): string {
    if (!userInfo) return "Unknown User";
    return userInfo.name || userInfo.email || this.shortenUserId(userInfo.userId);
  }
}