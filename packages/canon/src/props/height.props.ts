/*
 * Copyright 2025 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import type { PropDef, GetPropDefTypes } from './prop-def';

/** @public */
const heightPropDefs = {
  height: {
    type: 'string',
    className: 'bui-h',
    customProperties: ['--height'],
    responsive: true,
  },
  minHeight: {
    type: 'string',
    className: 'bui-min-h',
    customProperties: ['--min-height'],
    responsive: true,
  },
  maxHeight: {
    type: 'string',
    className: 'bui-max-h',
    customProperties: ['--max-height'],
    responsive: true,
  },
} satisfies {
  height: PropDef<string>;
  minHeight: PropDef<string>;
  maxHeight: PropDef<string>;
};

/** @public */
type HeightProps = GetPropDefTypes<typeof heightPropDefs>;

export { heightPropDefs };
export type { HeightProps };
