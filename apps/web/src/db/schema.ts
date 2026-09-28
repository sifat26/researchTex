import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  AnyPgColumn,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  avatar: varchar("avatar", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  rootFile: varchar("root_file", { length: 255 }).notNull().default("main.tex"),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const projectMembers = pgTable("project_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: varchar("role", { length: 50 }).notNull(), // 'OWNER', 'EDITOR', 'VIEWER'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  projectUserIdx: uniqueIndex("project_user_idx").on(table.projectId, table.userId),
}));

export const files = pgTable("files", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  parentId: uuid("parent_id").references((): AnyPgColumn => files.id, { onDelete: "cascade" }), // Self-referential for folders
  name: varchar("name", { length: 255 }).notNull(),
  path: text("path").notNull(), // Deterministic full path relative to project root (e.g., "sections/intro.tex")
  type: varchar("type", { length: 50 }).notNull(), // "file" | "folder"
  fileType: varchar("file_type", { length: 50 }).notNull().default("other"), // "tex", "bib", "image", etc.
  mimeType: varchar("mime_type", { length: 255 }),
  content: text("content"), // Phase 2: Storing text content directly in DB for simplicity
  sizeBytes: integer("size_bytes"),
  isBinary: boolean("is_binary").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const fileVersions = pgTable("file_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  fileId: uuid("file_id").references(() => files.id, { onDelete: "cascade" }).notNull(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  content: text("content").notNull(),
  message: varchar("message", { length: 255 }),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

