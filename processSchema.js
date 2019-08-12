const processSchema = schema => {
  const objects = schema.types
    .filter(type => type.kind === 'OBJECT')
    .map(type => ({
      name: type.name,
      requiredFields: (type.fields || [])
        .filter(field => field.type.kind === 'NON_NULL')
        .map(field => field.name)
    }));

  const interfaces = schema.types
    .filter(type => type.kind === 'INTERFACE')
    .map(type => ({
      name: type.name,
      possibleTypes: (type.possibleTypes || []).map(x => x.name)
    }));

  const requiredFields = objects
    .filter(x => x.requiredFields.length > 0)
    .reduce((acc, type) => {
      acc[type.name] = type.requiredFields;
      return acc;
    }, {});

  const possibleTypes = interfaces
    .filter(x => x.possibleTypes.length > 0)
    .reduce((acc, type) => {
      acc[type.name] = type.possibleTypes;
      return acc;
    }, {});

  return {
    requiredFields,
    possibleTypes,
    queryTypename: schema.queryType.name,
    mutationTypename: schema.mutationType.name
  };
};

module.exports = processSchema;
