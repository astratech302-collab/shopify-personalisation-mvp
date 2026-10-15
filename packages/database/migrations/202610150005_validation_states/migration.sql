ALTER TABLE "Experiment" DROP CONSTRAINT "Experiment_status_check";
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_status_check" CHECK ("status" IN ('draft','validating','ready','publishing','publish_failed','running','paused','ended'));
