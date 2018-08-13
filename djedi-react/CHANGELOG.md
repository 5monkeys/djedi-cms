### Version 0.1.1 (2018-08-13)

- Fixed: Nodes with null values returned from the server are now handled
  correctly. This happens when there’s neither a default value nor a database
  value. Previously this resulted in an error being rendered. Now an empty node
  is rendered, as expected.

### Version 0.1.0 (2018-07-03)

- Initial release.
