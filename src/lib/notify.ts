import { prisma } from "@/lib/prisma";

export async function createNotification(input: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string | null;
}) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? "",
      link: input.link ?? null,
    },
  });
}

/** Extract @user@domain.com style mentions from comment text. */
export function parseEmailMentions(text: string): string[] {
  const re = /@([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.add(m[1].toLowerCase());
  }
  return [...out];
}
