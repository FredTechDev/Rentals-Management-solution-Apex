# Testing Image Uploads

To test the `/repairs` or property image endpoints:

1. In Postman, set the request type to `POST`.
2. Go to the `Body` tab.
3. Select `form-data`.
4. Add a key named `image`.
5. Change the key type from `Text` to `File`.
6. Select any small `.jpg` or `.png` from your computer.

You can use any standard image for testing. The backend will store it in the `uploads/` directory and return the path.
