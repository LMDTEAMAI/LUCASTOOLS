import Joi from 'joi';

const userSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  height: Joi.number().min(0).max(300),
  weight: Joi.number().min(0).max(500),
  age: Joi.number().min(0).max(150),
  nationality: Joi.string(),
  occupation: Joi.string(),
  education: Joi.string(),
  hobbies: Joi.array().items(Joi.string()),
  favoriteColor: Joi.string(),
  gender: Joi.string().valid('Male', 'Female', 'Other', 'Prefer not to say'), // Add this line
});

export const validateUser = (req, res, next) => {
  const { error } = userSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  next();
};
