import { Fragment } from "react";

/**
 * A small comparison of two things: its first row names them (its first cell is unused), each other row is a label and
 * the two answers. Two columns, each row's label on its own line above its answers, so they have room on any phone.
 */
export function ComparisonTable({ rows }: { rows: readonly (readonly [string, string, string])[] }) {
  const [head, ...body] = rows;
  if (!head) return null;
  return (
    <table className="w-full table-fixed border-collapse text-left text-caption tracking-caption">
      <thead>
        <tr>
          <th scope="col" className="border-b-thin border-ink p-2 font-bold uppercase">
            {head[1]}
          </th>
          <th scope="col" className="border-b-thin border-ink p-2 font-bold uppercase">
            {head[2]}
          </th>
        </tr>
      </thead>
      <tbody>
        {body.map(([label, left, right]) => (
          <Fragment key={label}>
            <tr>
              <th scope="colgroup" colSpan={2} className="px-2 pt-3 font-bold text-section-label uppercase">
                {label}
              </th>
            </tr>
            <tr>
              <td className="border-b-thin border-line p-2 align-top font-medium">{left}</td>
              <td className="border-b-thin border-line p-2 align-top font-medium">{right}</td>
            </tr>
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}
