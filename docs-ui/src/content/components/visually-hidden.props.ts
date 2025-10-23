import {
  classNamePropDefs,
  stylePropDefs,
  type PropDef,
} from '@/utils/propDefs';

export const visuallyHiddenPropDefs: Record<string, PropDef> = {
  children: {
    type: 'enum',
    values: ['ReactNode'],
    responsive: false,
  },
  ...classNamePropDefs,
  ...stylePropDefs,
};

export const visuallyHiddenUsageSnippet = `import { VisuallyHidden } from '@backstage/ui';

<VisuallyHidden>
  This content is visually hidden but accessible to screen readers
</VisuallyHidden>`;

export const visuallyHiddenDefaultSnippet = `<Flex direction="column" gap="4">
  <Text as="p">
    This text is followed by a paragraph that is visually hidden but
    accessible to screen readers. Try using a screen reader to hear it, or
    inspect the DOM to see it's there.
  </Text>
  <VisuallyHidden>
    This content is visually hidden but accessible to screen readers
  </VisuallyHidden>
</Flex>`;

export const visuallyHiddenExampleUsageSnippet = `<Flex direction="column" gap="4">
  <VisuallyHidden>
    <Text as="h2">Footer links</Text>
  </VisuallyHidden>
  <Text as="p">
    <a href="#">About us</a>
  </Text>
  <Text as="p">
    <a href="#">Jobs</a>
  </Text>
  <Text as="p">
    <a href="#">Terms and Conditions</a>
  </Text>
</Flex>`;
