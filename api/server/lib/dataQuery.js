export function compileFilters(filters, columns, values = []) {
  if (!Array.isArray(filters) || filters.length > 50) throw new Error('invalid_filters');
  const column = name => {
    if (!columns.includes(name)) throw new Error('invalid_column');
    return `"${name}"`;
  };
  const param = value => { values.push(value); return `$${values.length}`; };
  const clause = f => {
    if (f.op === 'or') {
      const parts = String(f.value).split(',').map(part => {
        const m = part.match(/^([^\.]+)\.(eq|ilike)\.(.+)$/);
        if (!m) throw new Error('invalid_filter');
        return clause({ column: m[1], op: m[2], value: m[3] });
      });
      return `(${parts.join(' OR ')})`;
    }
    const c = column(f.column);
    if (f.op === 'is' && f.value === null) return `${c} IS NULL`;
    if (f.op === 'not' && f.operator === 'is' && f.value === null) return `${c} IS NOT NULL`;
    if (f.op === 'in') {
      if (!Array.isArray(f.value) || f.value.length > 2000) throw new Error('invalid_filter');
      return f.value.length ? `${c} IN (${f.value.map(param).join(',')})` : 'FALSE';
    }
    const op = { eq: '=', neq: '<>', ilike: 'ILIKE', gt: '>', gte: '>=', lt: '<', lte: '<=' }[f.op === 'not' && f.operator === 'eq' ? 'neq' : f.op];
    if (!op) throw new Error('invalid_filter');
    return `${c} ${op} ${param(f.value)}`;
  };
  return { where: filters.length ? filters.map(clause).join(' AND ') : 'TRUE', values };
}

export function compileRead(spec, key, query, identity) {
  const privateProfile = new Set(['license_image_url','license_number','resort_source_raw','resort_record_key']);
  const cols = spec.columns.filter(c => key !== 'profiles' || identity?.isAdmin || !privateProfile.has(c));
  const filters = query.filters ? JSON.parse(query.filters) : [];
  const { where, values } = compileFilters(filters, cols);
  const conditions = [where];
  if (!identity?.isAdmin) {
    if (['saved_posts','saved_resorts','notifications','reports','certifications'].includes(key)) {
      values.push(identity?.userId); conditions.push(`user_id=$${values.length}`);
    } else if (['rooms','participants','messages'].includes(key)) {
      values.push(identity?.userId);
      conditions.push(`${key === 'rooms' ? 'id' : 'room_id'} IN (SELECT room_id FROM app_participants WHERE user_id=$${values.length})`);
    }
  }
  const order = query.order ? JSON.parse(query.order) : { column: 'id' };
  if (!cols.includes(order.column)) throw new Error('invalid_order');
  const range = query.range ? JSON.parse(query.range) : null;
  const offset = range ? Number(range[0]) : 0;
  const limit = Math.min(2000, Number(query.limit ?? (range ? Number(range[1]) - offset + 1 : 1000)));
  if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 0) throw new Error('invalid_range');
  values.push(limit, offset);
  return { sql: `SELECT ${cols.map(c => `"${c}"`).join(',')} FROM ${spec.table} WHERE ${conditions.join(' AND ')} ORDER BY "${order.column}" ${order.ascending === false ? 'DESC' : 'ASC'}${order.column === 'id' ? '' : ', id ASC'} LIMIT $${values.length - 1} OFFSET $${values.length}`, values };
}
