import {Model} from '@nozbe/watermelondb';
import {Associations} from '@nozbe/watermelondb/Model';
import {
  field,
  text,
  immutableRelation,
  date,
  readonly,
  relation,
  writer,
  children,
} from '@nozbe/watermelondb/decorators';
import EventModel from './Event';
import PatientModel from './Patient';

// 'CREATE TABLE IF NOT EXISTS events (id varchar(32) PRIMARY KEY, patient_id varchar(32) REFERENCES patients(id) ON DELETE CASCADE, visit_id varchar(32) REFERENCES visits(id) ON DELETE CASCADE, event_type text, event_timestamp text, edited_at text, event_metadata text, deleted integer DEFAULT 0);',

export default class VisitModel extends Model {
  static table = 'visits';

  static associations: Associations = {
    patients: {type: 'belongs_to', key: 'patient_id'},
    events: {type: 'has_many', foreignKey: 'visit_id'},
  };

  @relation('patients', 'patient_id') patient!: PatientModel;
  @children('events') events!: EventModel;
  // @relation("events", 'visitId') event

  @text('patient_id') patientId!: string;
  @text('clinic_id') clinicId!: string;
  @text('provider_id') providerId!: string;
  @date('check_in_timestamp') checkInTimestamp!: Date;
  @field('is_deleted') isDeleted!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
