import { getPaths, readJson, withLock, writeJsonAtomic } from "./fileStore";
import type { StoredUser, UsersFile } from "./models";

const EMPTY: UsersFile = { users: [] };

async function loadUsers(): Promise<UsersFile> {
  const { usersFile } = getPaths();
  const data = await readJson<UsersFile>(usersFile, EMPTY);
  return { users: Array.isArray(data.users) ? data.users : [] };
}

export async function listUsers(): Promise<StoredUser[]> {
  const file = await loadUsers();
  return file.users;
}

export async function findUserById(id: string): Promise<StoredUser | null> {
  const users = await listUsers();
  return users.find((user) => user.id === id) ?? null;
}

export async function findUserByMobile(mobileNumber: string): Promise<StoredUser | null> {
  const users = await listUsers();
  return users.find((user) => user.mobileNumber === mobileNumber) ?? null;
}

export async function saveUser(user: StoredUser): Promise<StoredUser> {
  return withLock("users", async () => {
    const { usersFile } = getPaths();
    const file = await loadUsers();
    const index = file.users.findIndex((item) => item.id === user.id);
    if (index >= 0) {
      file.users[index] = user;
    } else {
      file.users.push(user);
    }
    await writeJsonAtomic(usersFile, file);
    return user;
  });
}
