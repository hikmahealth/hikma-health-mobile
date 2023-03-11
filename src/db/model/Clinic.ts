import {Model} from '@nozbe/watermelondb';
import {date, readonly, field, text} from '@nozbe/watermelondb/decorators';
import {Associations} from '@nozbe/watermelondb/Model';

export default class ClinicModel extends Model {
  static table = 'clinics';

  @text('name') name!: string;
  @field('is_deleted') isDeleted!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
