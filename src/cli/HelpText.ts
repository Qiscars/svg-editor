/**
 * `help` 的静态文本。
 *
 * 注意：这里是**过渡实现**。等命令注册表（CommandRegistry）落地后，帮助信息
 * 应由各命令对象自己声明用法、统一汇总生成，避免"加一条命令要改两处"。
 * 见 doc/README.md §1.5 待重构项。
 */
export const HELP_TEXT: readonly string[] = [
  'Document commands:',
  '  init [w] [h]                     create a new canvas (default 800x600)',
  '  read <file.svg>                  load an SVG file as the current document',
  '  save [file.svg]                  save the current document',
  '  canvas [w] [h]                   show or change the canvas size',
  '',
  'Shape commands:',
  '  create <type> <id> [params...] [in <containerId>]',
  '  delete <id>                      delete a shape (with all descendants)',
  '  move <id> <dx> <dy>              translate a shape (or a whole container)',
  '  scale <id> <factor>              scale a shape around the origin',
  '  set <id> <attr> <value>          change an attribute',
  '  group <newGid> <id1> <id2> ...   wrap existing shapes into a new container',
  '  ungroup <gid>                    dissolve a container',
  '  addto <gid> <id>                 move an existing shape into a container',
  '  front <id> / back <id>           change z-order among siblings',
  '',
  'Display commands:',
  '  tree [id]                        show the structure tree',
  '  show <id>                        show one shape in detail',
  '  help                             show this message',
  '',
  'History:',
  '  undo / redo',
];
