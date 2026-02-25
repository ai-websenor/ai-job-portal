const regex = {
  validPassword:
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  validPAN: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  validGST: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
  validURL: /^(https?:\/\/)?([\w\d\-_]+\.)+[\w\d\-_]+(\/.*)?$/i,
};

export default regex;
