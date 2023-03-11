import {Model} from '@nozbe/watermelondb';
import {date, text} from '@nozbe/watermelondb/decorators';
import {Associations} from '@nozbe/watermelondb/Model';

export default class StringContentModel extends Model {
  static table = 'string_content';
  static association: Associations = {
    string_ids: {type: 'belongs_to', key: 'string_id'},
  };

  @text('string_id') stringId!: string;
  @text('language') language!: string;
  @text('content') content!: string;
  @date('edited_at') editedAt!: Date;
}
