'use client';

import { FC } from 'react';
import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { Input } from '@gitroom/react/form/input';
import { Select } from '@gitroom/react/form/select';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { WordpressPostType } from '@gitroom/frontend/components/new-launch/providers/wordpress/wordpress.post.type';
import { WordpressTerms } from '@gitroom/frontend/components/new-launch/providers/wordpress/wordpress.terms';
import { MediaComponent } from '@gitroom/frontend/components/media/media.component';
import { WordpressDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/wordpress.dto';

// The saved date is a full UTC ISO string, which a datetime-local box cannot
// show: Chrome blanks it, and a blur then read the blank box back and dropped
// the backdate. So the box is controlled: it shows the date cut to minutes and
// writes a full ISO string back.
const BackdateInput: FC = () => {
  const form = useSettings();
  const date = form.watch('date');
  const shown =
    date && !isNaN(Date.parse(date))
      ? new Date(date).toISOString().slice(0, 16)
      : '';
  return (
    <Input
      label="Backdate to (UTC, optional)"
      type="datetime-local"
      name="date"
      disableForm
      value={shown}
      onChange={(e) =>
        form.setValue(
          'date',
          e.target.value ? `${e.target.value}:00.000Z` : undefined,
          { shouldValidate: true, shouldDirty: true }
        )
      }
    />
  );
};

const WordpressSettings: FC = () => {
  const form = useSettings();
  return (
    <>
      <Input label="Title" {...form.register('title')} />
      <WordpressPostType {...form.register('type')} />
      <Select label="Status" {...form.register('status', { value: 'publish' })}>
        <option value="publish">Publish</option>
        <option value="draft">Draft</option>
        <option value="pending">Pending</option>
        <option value="private">Private</option>
      </Select>
      <BackdateInput />
      <WordpressTerms
        label="Categories"
        func="categoriesList"
        {...form.register('categories')}
      />
      <WordpressTerms
        label="WordPress Tags"
        func="tagsList"
        {...form.register('tags')}
      />
      <MediaComponent
        label="Cover picture"
        description="Add a cover picture"
        {...form.register('main_image')}
      />
    </>
  );
};
export default withProvider({
  postComment: PostComment.COMMENT,
  minimumCharacters: [],
  SettingsComponent: WordpressSettings,
  CustomPreviewComponent: undefined, // WordpressPreview,
  dto: WordpressDto,
  maximumCharacters: 100000,
  inlineImages: true,
});
