export const validate = (schema, property = "body") => {
  return (req, res, next) => {
    const { error } = schema.validate(req[property], { abortEarly: false, allowUnknown: true });
    if (error) {
      return res.status(400).json({ 
        error: error.details.map((d) => d.message) 
      });
    }
    next();
  };
};