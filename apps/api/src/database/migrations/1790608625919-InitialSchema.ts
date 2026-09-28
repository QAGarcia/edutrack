import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1790608625919 implements MigrationInterface {
    name = 'InitialSchema1790608625919'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('ADMIN', 'TEACHER', 'STUDENT')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(120) NOT NULL, "email" character varying(160) NOT NULL, "password_hash" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'STUDENT', "bio" character varying(300) NOT NULL DEFAULT '', "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `);
        await queryRunner.query(`CREATE TABLE "categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(60) NOT NULL, "slug" character varying(80) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_8b0be371d28245da6e4f4b6187" ON "categories" ("name") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_420d9f679d41281f282f5bc7d0" ON "categories" ("slug") `);
        await queryRunner.query(`CREATE TABLE "lessons" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(120) NOT NULL, "content" text NOT NULL DEFAULT '', "duration_minutes" integer NOT NULL, "position" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "course_id" uuid NOT NULL, CONSTRAINT "PK_9b9a8d455cac672d262d7275730" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_765d7de9ac3322c674bc92f376" ON "lessons" ("course_id", "position") `);
        await queryRunner.query(`CREATE TYPE "public"."courses_level_enum" AS ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED')`);
        await queryRunner.query(`CREATE TYPE "public"."courses_status_enum" AS ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED')`);
        await queryRunner.query(`CREATE TABLE "courses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(120) NOT NULL, "slug" character varying(100) NOT NULL, "summary" character varying(200) NOT NULL, "description" text NOT NULL DEFAULT '', "level" "public"."courses_level_enum" NOT NULL, "workload_hours" integer NOT NULL, "capacity" integer NOT NULL, "status" "public"."courses_status_enum" NOT NULL DEFAULT 'DRAFT', "published_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "category_id" uuid NOT NULL, "teacher_id" uuid NOT NULL, CONSTRAINT "PK_3f70a487cc718ad8eda4e6d58c9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a3bb2d01cfa0f95bc5e034e1b7" ON "courses" ("slug") `);
        await queryRunner.query(`CREATE INDEX "IDX_889f2701163f86b2faf62a6247" ON "courses" ("status") `);
        await queryRunner.query(`CREATE TABLE "grades" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "assessment" character varying(20) NOT NULL, "value" numeric(4,2) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "enrollment_id" uuid NOT NULL, CONSTRAINT "uq_grade_assessment" UNIQUE ("enrollment_id", "assessment"), CONSTRAINT "PK_4740fb6f5df2505a48649f1687b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "lesson_progress" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "completed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "enrollment_id" uuid NOT NULL, "lesson_id" uuid NOT NULL, CONSTRAINT "uq_progress_lesson" UNIQUE ("enrollment_id", "lesson_id"), CONSTRAINT "PK_e6223ebbc5f8f5fce40e0193de1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "certificates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(20) NOT NULL, "student_name" character varying(120) NOT NULL, "course_title" character varying(120) NOT NULL, "teacher_name" character varying(120) NOT NULL, "workload_hours" integer NOT NULL, "final_average" numeric(4,2) NOT NULL, "issued_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "enrollment_id" uuid NOT NULL, CONSTRAINT "REL_f0f3773b2ccb7811da9ccd63d9" UNIQUE ("enrollment_id"), CONSTRAINT "PK_e4c7e31e2144300bea7d89eb165" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_e9e6937f74d9a653f0fc329913" ON "certificates" ("code") `);
        await queryRunner.query(`CREATE TYPE "public"."enrollments_status_enum" AS ENUM('ACTIVE', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "enrollments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "status" "public"."enrollments_status_enum" NOT NULL DEFAULT 'ACTIVE', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "cancelled_at" TIMESTAMP WITH TIME ZONE, "student_id" uuid NOT NULL, "course_id" uuid NOT NULL, CONSTRAINT "PK_7c0f752f9fb68bf6ed7367ab00f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_enrollment_active" ON "enrollments" ("student_id", "course_id") WHERE "status" = 'ACTIVE'`);
        await queryRunner.query(`ALTER TABLE "lessons" ADD CONSTRAINT "FK_3c4e299cf8ed04093935e2e22fe" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "courses" ADD CONSTRAINT "FK_e4c260fe6bb1131707c4617f745" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "courses" ADD CONSTRAINT "FK_fad76a730ee7f68d0a59652fb12" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "grades" ADD CONSTRAINT "FK_ce4136a5756d2fe2ee20fe01a3d" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lesson_progress" ADD CONSTRAINT "FK_2374c15822383f7e5362e27d417" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lesson_progress" ADD CONSTRAINT "FK_980e74721039ebe210fee2eeca2" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "certificates" ADD CONSTRAINT "FK_f0f3773b2ccb7811da9ccd63d94" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "enrollments" ADD CONSTRAINT "FK_307813fe255896d6ebf3e6cd55c" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "enrollments" ADD CONSTRAINT "FK_b79d0bf01779fdf9cfb6b092af3" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "enrollments" DROP CONSTRAINT "FK_b79d0bf01779fdf9cfb6b092af3"`);
        await queryRunner.query(`ALTER TABLE "enrollments" DROP CONSTRAINT "FK_307813fe255896d6ebf3e6cd55c"`);
        await queryRunner.query(`ALTER TABLE "certificates" DROP CONSTRAINT "FK_f0f3773b2ccb7811da9ccd63d94"`);
        await queryRunner.query(`ALTER TABLE "lesson_progress" DROP CONSTRAINT "FK_980e74721039ebe210fee2eeca2"`);
        await queryRunner.query(`ALTER TABLE "lesson_progress" DROP CONSTRAINT "FK_2374c15822383f7e5362e27d417"`);
        await queryRunner.query(`ALTER TABLE "grades" DROP CONSTRAINT "FK_ce4136a5756d2fe2ee20fe01a3d"`);
        await queryRunner.query(`ALTER TABLE "courses" DROP CONSTRAINT "FK_fad76a730ee7f68d0a59652fb12"`);
        await queryRunner.query(`ALTER TABLE "courses" DROP CONSTRAINT "FK_e4c260fe6bb1131707c4617f745"`);
        await queryRunner.query(`ALTER TABLE "lessons" DROP CONSTRAINT "FK_3c4e299cf8ed04093935e2e22fe"`);
        await queryRunner.query(`DROP INDEX "public"."uq_enrollment_active"`);
        await queryRunner.query(`DROP TABLE "enrollments"`);
        await queryRunner.query(`DROP TYPE "public"."enrollments_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e9e6937f74d9a653f0fc329913"`);
        await queryRunner.query(`DROP TABLE "certificates"`);
        await queryRunner.query(`DROP TABLE "lesson_progress"`);
        await queryRunner.query(`DROP TABLE "grades"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_889f2701163f86b2faf62a6247"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a3bb2d01cfa0f95bc5e034e1b7"`);
        await queryRunner.query(`DROP TABLE "courses"`);
        await queryRunner.query(`DROP TYPE "public"."courses_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."courses_level_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_765d7de9ac3322c674bc92f376"`);
        await queryRunner.query(`DROP TABLE "lessons"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_420d9f679d41281f282f5bc7d0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8b0be371d28245da6e4f4b6187"`);
        await queryRunner.query(`DROP TABLE "categories"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    }

}
