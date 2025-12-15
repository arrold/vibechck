
import jwt from 'jsonwebtoken';

// Insecure: decoding without verification
const token = "eyJhbGciOiJub25lIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.";
const decoded = jwt.decode(token);

// Critical: 'none' algorithm
const forgedToken = jwt.sign({ foo: 'bar' }, 'secret', { algorithm: 'none' });
