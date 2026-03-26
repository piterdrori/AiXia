// utils.ts - Add the missing export
export function extractMentionedUserIds(content: string, candidates: { user_id: string; full_name: string | null }[]): string[] {
  const mentions: string[] = [];
  const mentionRegex = /@([^\s]+)/g;
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    const name = match[1].toLowerCase();
    const user = candidates.find(c => 
      (c.full_name || "").toLowerCase().includes(name) ||
      name.includes((c.full_name || "").toLowerCase().split(" ")[0].toLowerCase())
    );
    if (user) mentions.push(user.user_id);
  }
  
  return [...new Set(mentions)];
}
