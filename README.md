# rsc-models
(de)serialize runescape classic 3D model archives to and from
[wavefront .obj and .mtl](https://en.wikipedia.org/wiki/Wavefront_.obj_file)
files. supports automatic UV unwrapping. works with blender import and export.

## install

    $ npm install @2003scape/rsc-models # -g for CLI program

## cli usage


## example
```javascript
```

## api
### models = new Models()
create a new models (de)serializer instance.

### models.loadArchive(buffer)
loads a models jag archive buffer.

### models.getModelByName(name)
return a `Model` instance by name (defined in
[rsc-config](https://github.com/2003scape/rsc-config/blob/master/config-json/models.json)).

### models.getModelById(id)
return a `Model` instance based on index of model name.

### models.getModels()
return an array of all `Model` instances.

### models.fromWavefront(objFile, mtlFile)
return a `Model` instance from wavefront .obj and .mtl file strings.

### models.toArchive()
return a models jag archive.

## license
Copyright 2022  2003Scape Team

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU Affero General Public License as published by the
Free Software Foundation, either version 3 of the License, or (at your option)
any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY
WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License along
with this program. If not, see http://www.gnu.org/licenses/.
