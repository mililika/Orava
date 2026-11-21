import { randomBytes } from 'node:crypto';

import { Injectable, type OnModuleInit } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';

/**
 * Checks passwords against the bcrypt hashes in `users.password_hash` (made by pgcrypto as
 * `$2a$12$…`; the salt and cost are part of the hash). The server never creates or changes
 * passwords: the owner does that in SQL.
 */
@Injectable()
export class PasswordService implements OnModuleInit {
  /**
   * A cost-12 hash of random bytes nobody knows, made at startup, so it's never in the repo. An
   * unknown username is checked against it, so that answer takes as long as a wrong password.
   */
  private dummyHash = '';

  async onModuleInit(): Promise<void> {
    this.dummyHash = await hash(randomBytes(32).toString('hex'), 12);
  }

  verify(password: string, passwordHash: string): Promise<boolean> {
    return compare(password, passwordHash);
  }

  /** Spends the same time as `verify` and always fails. */
  async verifyDummy(password: string): Promise<false> {
    await compare(password, this.dummyHash);
    return false;
  }
}
