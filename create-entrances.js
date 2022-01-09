var util = require("josm/util");
var cmd = require("josm/command");
var layers = require("josm/layers");
var nb = require("josm/builder").NodeBuilder;
var activeLayer = layers.activeLayer;
util.assert(activeLayer != null, "No activeLayer!");
var ds = activeLayer.data;

function print_ids(way) {
    var nodes = way.getNodes();
    var l = nodes.size();
    for (var i=0; i<l; i++) {
        util.println("{0} = {1}",i,nodes.get(i).id%1000);
    }
}

function add_entrance(n1,n2,ll1,ll2,proportion,tags) {
    var new_ll = ll1.interpolate(ll2,proportion);

    var parent_ways = n1.getParentWays();
    if(parent_ways.isEmpty())
        util.assert(false, "No parent ways!");

    var build = parent_ways.get(0);
    var b_nodes = build.getNodes();
    var node1_offset = b_nodes.indexOf(n1);
    var node2_offset = b_nodes.indexOf(n2);

    if(node1_offset<node2_offset) {
        var min_offset = node1_offset;
        var max_offset =  node2_offset;
    }
    else {
        var min_offset = node2_offset;
        var max_offset =  node1_offset;
    }

    var new_n = nb.create();
    new_n.pos = new_ll;
    new_n.tags = tags;

    if(min_offset==0 && max_offset==1) {
        //build.addNode(1,new_n);
        b_nodes.add(1,new_n);
        //util.println("addNode({0},new_n)",1);
    }
    else if(min_offset==0) {
        //build.addNode(max_offset+1,new_n);
        b_nodes.add(max_offset+1,new_n);
        //util.println("addNode({0},new_n)",max_offset+1);
    }
    else {
        //build.addNode(min_offset+1, new_n);
        b_nodes.add(min_offset+1,new_n);
        //util.println("addNode({0},new_n)",min_offset+1);
    }

    //util.println("\n\n nodes {0}",{nodes: b_nodes});

    activeLayer.apply(
        cmd.add(new_n),
        cmd.change(build,{nodes: b_nodes.toArray()})
    );

    //print_ids(build);

    return new_n; //возвращаем созданную новую точку
}

//парсит строку вида "2:109-144" и возвращает теги подъезда
function get_tags(entr_string) {
    var entr = entr_string.split(":");
    var tags = {"entrance": "staircase", "ref": entr[0],"addr:flats": entr[1].trim() };
    return tags;
}

//добавляет подъезды из массива строк
function add_entrances(arr_entr_str) {
    var sel_len = ds.selection.nodes.length;
    if(sel_len != 2) {
        josm.alert("Не выделены две точки крайних подъездов");
        return;
    }

    var n1 = ds.selection.nodes[0];
    var n2 = ds.selection.nodes[1];

    //являются ли соседними выбранные точки?
    var parent_ways = n1.getParentWays();
    if(parent_ways.isEmpty()) {
        josm.alert("Не найден parent way у выделенной точки");
        return;
    }
    var build = parent_ways.get(0);
    var neigs = build.getNeighbours(n1).toArray();
    if( neigs[0].id != n2.id && neigs[1].id != n2.id ) {
        josm.alert("Выделенные точки не соседние");
        return;
    }

    //получаем объекты LatLon
    var ll1 = n1.getCoor();
    var ll2 = n2.getCoor();

    //отмечаем теги первого подъезда
    activeLayer.apply(
        cmd.change(n1, {tags: get_tags(arr_entr_str[0])})
    );

    var new_n = n1;
    var num_entrances = arr_entr_str.length;
    // util.println("num_entrances {0}",num_entrances);
    for (var i=2; i<num_entrances; i++) {
        // util.println("add entrance {0}/{1}",i-1,num_entrances-1);
        var tags = get_tags(arr_entr_str[i-1]);
        // util.println("\"{0}: {1}\",",tags.ref,tags["addr:flats"]);
        new_n = add_entrance(new_n,n2,ll1,ll2,(i-1)/(num_entrances-1),tags);
    }

    //отмечаем теги последнего подъезда
    activeLayer.apply(
        cmd.change(n2, {tags: get_tags(arr_entr_str[num_entrances-1])})
    );
}

function show_UI(f_create,f_gen) {
    var JFrame = javax.swing.JFrame;
    var JButton = javax.swing.JButton;
    var JTextArea = javax.swing.JTextArea;
    var GroupLayout = javax.swing.GroupLayout;
    var JTextField = javax.swing.JTextField;
    var JLabel = javax.swing.JLabel;

    var frame = new JFrame();
    frame.setTitle("Подъезды");
    //frame.setSize(260,300);

    var jt1 = new JTextField("5",2);
    jt1.setToolTipText("Кол-во подъездов");
    var jt2 = new JTextField("36",3);
    jt2.setToolTipText("Кол-во квартир в каждом подъезде");
    var jt3 = new JTextField("1",3);
    jt3.setToolTipText("Начальный номер квартиры");

    var ta = new JTextArea("1:1-36\n2:37-72");
    var button = new JButton("Создать");
    var b_gen = new JButton("Генерировать");

    button.addActionListener(function() {
        //util.println("click {0}",ta.getText());
        f_create(ta.getText());
    });

    b_gen.addActionListener(function() {
        //util.println("click {0}",ta.getText());
        var new_text = f_gen(jt1.getText(),jt2.getText(),jt3.getText());
        ta.setText(new_text);
    });

    var layout = new GroupLayout(frame.getContentPane());
    frame.getContentPane().setLayout(layout);
    layout.setAutoCreateGaps(true);
    layout.setAutoCreateContainerGaps(true);

    layout.setHorizontalGroup(
        layout.createParallelGroup(GroupLayout.Alignment.TRAILING)
            .addGroup(
                layout.createSequentialGroup()
                    .addComponent(jt1, GroupLayout.PREFERRED_SIZE, GroupLayout.DEFAULT_SIZE,GroupLayout.PREFERRED_SIZE)
                    .addComponent(jt2,GroupLayout.PREFERRED_SIZE, GroupLayout.DEFAULT_SIZE,GroupLayout.PREFERRED_SIZE)
                    .addComponent(jt3,GroupLayout.PREFERRED_SIZE, GroupLayout.DEFAULT_SIZE,GroupLayout.PREFERRED_SIZE)
                    .addComponent(b_gen)
            )
            .addComponent(ta)
            .addComponent(button)
    );

    layout.setVerticalGroup(
        layout.createSequentialGroup()
            .addGroup(
                layout.createParallelGroup(GroupLayout.Alignment.BASELINE)
                    .addComponent(jt1,GroupLayout.PREFERRED_SIZE, GroupLayout.DEFAULT_SIZE,GroupLayout.PREFERRED_SIZE)
                    .addComponent(jt2,GroupLayout.PREFERRED_SIZE, GroupLayout.DEFAULT_SIZE,GroupLayout.PREFERRED_SIZE)
                    .addComponent(jt3,GroupLayout.PREFERRED_SIZE, GroupLayout.DEFAULT_SIZE,GroupLayout.PREFERRED_SIZE)
                    .addComponent(b_gen))
            .addComponent(ta)
            .addComponent(button)
    );

    frame.pack();
    frame.setLocationRelativeTo(null);
    frame.setSize(frame.getSize().width, 300);
    frame.getRootPane().setDefaultButton(b_gen);

    // frame.setAlwaysOnTop(true);

    frame.setVisible(true);
}

function proc(text) {
    var arr = text.split("\n");
    var native_arr = new org.mozilla.javascript.NativeArray(arr);
    add_entrances(native_arr);
}

function gen(entr_num,flats_in_entr,start_flat) {
    var text = "";

    var cur_start_flat = Number(start_flat);
    flats_in_entr = Number(flats_in_entr);

    for (var i=1; i<=entr_num; i++) {
        var cur_end_flat = cur_start_flat+flats_in_entr - 1;
        text = text +i+":" + cur_start_flat +"-" + cur_end_flat ;
        if(i!=entr_num)
            text = text + "\n";
        cur_start_flat += flats_in_entr;
    }

    return text;
}

show_UI(proc,gen);
