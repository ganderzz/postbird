var Trigger = Model.base.extend({
  klassExtend: {
    findAll: function (callback) {
      var sql = `
        select
          pg_class.relname as table_name,
          pg_proc.proname as proc_name,
          pg_constraint.conname as constraint_name,
          pg_trigger.*
        from pg_trigger
        left outer join pg_constraint on (pg_trigger.tgconstraint = pg_constraint.oid)
        inner join pg_proc on (pg_trigger.tgfoid = pg_proc.oid)
        inner join pg_class on (pg_trigger.tgrelid = pg_class.oid)
      `;

      return new Promise((resolve, reject) => {
        Model.base.q(sql, (data, error) => {
          if (error) {
            callback([], error);
            return reject(error);
          }
          var triggers = [];
          data.rows.forEach((row) => {
            triggers.push(new Trigger('public', row));
          });
          callback && callback(triggers);
          resolve(triggers);
        });
      });
    },

    find: function (table, name, callback) {
      var sql = `
        select pg_class.relname as table_name, pg_proc.proname as proc_name, pg_trigger.*
        from pg_trigger, pg_proc, pg_class
        where
          pg_trigger.tgfoid = pg_proc.oid and
          pg_trigger.tgrelid = pg_class.oid
          pg_class.relname = "%s" and pg_trigger.tgname = "%s"
      `

      Model.base.q(sql, table, name, (data, error) => {
        if (error) {
          callback();
          return;
        }
        if (data.rows[0]) {
          callback(Trigger('public', data.rows[0]));
        } else {
          callback();
        }
      });
    },

    // https://github.com/postgres/postgres/blob/master/src/include/catalog/pg_trigger.h#L93
    decodeTgType: function (typeNum) {
      var nums = Number(typeNum).toString(2).split("").reverse();
      var actions = ["row", "before", "insert", "delete", "update", "truncate", "instead"];
      var res = [];
      nums.forEach((num, pos) => {
        if (num == "1") res.push(actions[pos]);
      });

      //console.log("tgtype", typeNum, nums, res);

      return res;
    },

    encodeTgType: function (actions) {
      
    }
  },

  init: function (schema, trigger_data) {
    this.schema = schema;
    this.data = trigger_data;
  },

  typeDesc: function () {
    return Trigger.decodeTgType(this.data.tgtype);
  },

  drop: function (callback) {
    var sql = "DROP TRIGGER %s on %s";

    this.q(sql, this.name, this.table_name, (result, error) => {
      if (error) {
        throw error;
      }
      callback(result, error);
    });
  },
});

!function () {
  var props = ['table_name', 'proc_name', 'constraint_name'];
  props.forEach((prop) => {
    Object.defineProperty(Trigger.prototype, prop, {
      get: function () {
        return this.data[prop];
      }
    });
  });

  Object.defineProperty(Trigger.prototype, 'name', {
    get: function () {
      return this.data.tgname;
    }
  });

}();

module.exports = Trigger;
