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
import {Patient} from '../../types/Patient';
import StringIdModel from './StringId';
import StringContentModel from './StringContent';
import {Language} from '../../types/Language';
import {StringContent} from '../../types/StringContent';

// 'CREATE TABLE IF NOT EXISTS patients (id varchar(32) PRIMARY KEY, given_name varchar(32) REFERENCES string_ids(id) ON DELETE CASCADE, surname varchar(32) REFERENCES string_ids(id) ON DELETE CASCADE, date_of_birth varchar(10), country varchar(32) REFERENCES string_ids(id), hometown varchar(32) REFERENCES string_ids(id) ON DELETE CASCADE, section varchar(32) REFERENCES string_ids(id) ON DELETE CASCADE, serial_number text, registered_by_provider_id text, phone text, sex varchar(1), image_timestamp text, edited_at text, deleted integer DEFAULT 0);',

export default class PatientModel extends Model {
  static table = 'patients';

  static associations: Associations = {
    visits: {type: 'has_many', foreignKey: 'patient_id'},
  };

  // @relation('visits', 'patient_id') visit;
  @children('visits') visits: any;

  // @text('id') id;
  @text('given_name') givenName!: string;
  @text('surname') surname!: string;
  @text('date_of_birth') dateOfBirth!: string;
  @text('country') country!: string;
  @text('hometown') hometown!: string;
  @text('phone') phone!: string;
  @text('sex') sex!: string;
  @text('camp') camp!: string;
  @date('image_timestamp') imageTimestamp?: number;
  @field('is_deleted') isDeleted!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
