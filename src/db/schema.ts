import { relations } from "drizzle-orm";
import {
  boolean,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["ADMIN", "ANALYST", "VIEWER"]);
export const recordTypeEnum = pgEnum("record_type", ["income", "expense"]);

export const usersTable = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  email: text().notNull().unique(),
  password: text().notNull(),
  role: userRoleEnum().notNull(),
  isActive: boolean().notNull().default(true),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const recordsTable = pgTable("records", {
  id: uuid().primaryKey().defaultRandom(),
  amount: numeric({ precision: 12, scale: 2 }).notNull(),
  type: recordTypeEnum().notNull(),
  category: text().notNull(),
  date: timestamp({ withTimezone: true }).notNull(),
  note: text(),
  userId: uuid()
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const usersRelations = relations(usersTable, ({ many }) => ({
  records: many(recordsTable),
}));

export const recordsRelations = relations(recordsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [recordsTable.userId],
    references: [usersTable.id],
  }),
}));
