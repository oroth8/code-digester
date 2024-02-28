// Example middleware
const exampleMiddleware = (req, res, next) => {
  console.log("Middleware executed!");
  next();
};

export default exampleMiddleware;
