import {Model} from '@nozbe/watermelondb';
import {Associations} from '@nozbe/watermelondb/Model';
import {
  field,
  text,
  immutableRelation,
  date,
  readonly,
  writer,
} from '@nozbe/watermelondb/decorators';

// 'CREATE TABLE IF NOT EXISTS events (id varchar(32) PRIMARY KEY, patient_id varchar(32) REFERENCES patients(id) ON DELETE CASCADE, visit_id varchar(32) REFERENCES visits(id) ON DELETE CASCADE, event_type text, event_timestamp text, edited_at text, event_metadata text, deleted integer DEFAULT 0);',

export default class EventModel extends Model {
  static table = 'events';

  static associations: Associations = {
    patients: {type: 'belongs_to', key: 'patient_id'},
    visits: {type: 'belongs_to', key: 'visit_id'},
  };

  @text('patient_id') patientId;
  @text('visit_id') visitId;
  @text('event_type') eventType;
  @text('event_metadata') eventMetadata;
  @field('is_deleted') isDeleted;
  @readonly @date('created_at') createdAt;
  @readonly @date('updated_at') updatedAt;
}
