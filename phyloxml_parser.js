/**
 *  Copyright (C) 2016 Christian M. Zmasek
 *  Copyright (C) 2016 J. Craig Venter Institute
 *  All rights reserved
 *
 *  This library is free software; you can redistribute it and/or
 *  modify it under the terms of the GNU Lesser General Public
 *  License as published by the Free Software Foundation; either
 *  version 2.1 of the License, or (at your option) any later version.
 *
 *  This library is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 *  Lesser General Public License for more details.
 *
 *  You should have received a copy of the GNU Lesser General Public
 *  License along with this library; if not, write to the Free Software
 *  Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301, USA
 *
 *  Created by czmasek on 7/7/2016.
 */

/**
 * This requires sax-js from https://github.com/isaacs/sax-js
 *
 * Usage:
 *
 * Synchronous parsing of phyloXML-formatted string:
 *
 * var phyloxml_parser = require('./phyloxml_parser');
 * var p = phyloxml_parser.phyloXmlParser;
 *
 * var phys = p.parse(phyloxml_text, {trim: true, normalize: true});
 *
 *
 * Asynchronous parsing of phyloXML-formatted stream:
 *
 * var fs = require('fs');
 * var phyloxml_parser = require('./phyloxml_parser');
 * var p = phyloxml_parser.phyloXmlParser;
 *
 * var stream = fs.createReadStream(xmlfile, {encoding: 'utf8'});
 *
 * p.parseAsync(stream, {trim: true, normalize: true});
 *
 */
(function phyloXmlParser() {

    "use strict";

    var sax = null;
    if (typeof module !== 'undefined' && module.exports && !global.xmldocAssumeBrowser) {
        // Being used in a Node-like environment
        sax = require('./lib/sax');
    }
    else if (typeof window !== "undefined") {
        // Attached to the Window object in a browser
        sax = window.sax;
        if (!sax) {
            throw new Error("Expected sax to be defined. Make sure you are including sax.js before this file.");
        }
    }
    else {
        sax = this.sax;
        if (!sax) {
            throw new Error("Expected sax to be defined. Make sure you are including sax.js before this file.");
        }
    }

    // --------------------------------------------------------------
    // phyloXML constants
    // --------------------------------------------------------------

    // Accession
    var ACCESSION = 'accession';
    var ACCESSION_SOURCE_ATTR = 'source';
    var ACCESSION_COMMENT_ATTR = 'comment';

    // Annotation
    var ANNOTATION = 'annotation';
    var ANNOTATION_REF_ATTR = 'ref';
    var ANNOTATION_SOURCE_ATTR = 'source';
    var ANNOTATION_EVIDENCE_ATTR = 'evidence';
    var ANNOTATION_TYPE_ATTR = 'type';
    var ANNOTATION_DESC = 'desc';

    // Clade
    var CLADE = 'clade';
    var CLADE_BRANCH_LENGTH = 'branch_length';
    var CLADE_ID_SOURCE_ATTR = 'id_source';
    var CLADE_COLLAPSE_ATTR = 'collapse';
    var CLADE_NAME = 'name';
    var CLADE_WIDTH = 'width';

    // Clade Relation
    var CLADE_RELATION = 'clade_relation';
    var CLADE_RELATION_DISTANCE_ATTR = 'distance';
    var CLADE_RELATION_ID_REF_0_ATTR = 'id_ref_0';
    var CLADE_RELATION_ID_REF_1_ATTR = 'id_ref_1';
    var CLADE_RELATION_TYPE_ATTR = 'type';

    // Sequence Relation
    var SEQUENCE_RELATION = 'sequence_relation';
    var SEQUENCE_RELATION_DISTANCE_ATTR = 'distance';
    var SEQUENCE_RELATION_ID_REF_0_ATTR = 'id_ref_0';
    var SEQUENCE_RELATION_ID_REF_1_ATTR = 'id_ref_1';
    var SEQUENCE_RELATION_TYPE_ATTR = 'type';

    // Color
    var COLOR = 'color';
    var COLOR_RED = 'red';
    var COLOR_GREEN = 'green';
    var COLOR_BLUE = 'blue';
    var COLOR_ALPHA = 'alpha';

    // Confidence
    var CONFIDENCE = 'confidence';
    var CONFIDENCE_TYPE_ATTR = 'type';
    var CONFIDENCE_STDDEV_ATTR = 'stddev';

    // Cross References
    var CROSS_REFERENCES = 'cross_references';

    // Date
    var DATE = 'date';
    var DATE_UNIT_ATTR = 'unit';
    var DATE_DESC = 'desc';
    var DATE_VALUE = 'value';
    var DATE_MINIMUM = 'minimum';
    var DATE_MAXIMUM = 'maximum';

    // Distribution
    var DISTRIBUTION = 'distribution';
    var DISTRIBUTION_DESC = 'desc';

    // Domain Architecture
    var DOMAIN_ARCHITECTURE = 'domain_architecture';
    var DOMAIN_ARCHITECTURE_LENGTH_ATTR = 'length';

    // Events
    var EVENTS = 'events';
    var EVENTS_TYPE = 'type';
    var EVENTS_DUPLICATIONS = 'duplications';
    var EVENTS_SPECIATIONs = 'speciations';
    var EVENTS_LOSSES = 'losses';

    // Id
    var ID = 'id';
    var ID_PROVIDER_ATTR = 'provider';

    // Mol Seq
    var MOLSEQ = 'mol_seq';
    var MOLSEQ_IS_ALIGNED_ATTR = 'is_aligned';

    // Phylogeny
    var PHYLOGENY = 'phylogeny';

    // Phyloxml
    var PHYLOXML = 'phyloxml';

    // Point
    var POINT = 'point';
    var POINT_ALT_UNIT_ATTR = 'alt_unit';
    var POINT_GEODETIC_DATUM_ATTR = 'geodetic_datum';
    var POINT_LAT = 'lat';
    var POINT_LONG = 'long';
    var POINT_ALT = 'alt';

    // Property
    var PROPERTY = 'property';
    var PROPERTY_REF_ATTR = 'ref';
    var PROPERTY_ID_REF_ATTR = 'id_ref';
    var PROPERTY_UNIT_ATTR = 'unit';
    var PROPERTY_DATATYPE_ATTR = 'datatype';
    var PROPERTY_APPLIES_TO_ATTR = 'applies_to';

    // Protein Domain
    var PROTEINDOMAIN = 'domain';
    var PROTEINDOMAIN_FROM_ATTR = 'from';
    var PROTEINDOMAIN_TO_ATTR = 'to';
    var PROTEINDOMAIN_CONFIDENCE_ATTR = 'confidence';
    var PROTEINDOMAIN_ID_ATTR = 'id';

    // Reference
    var REFERENCE = 'reference';
    var REFERENCE_DOI_ATTR = 'doi';
    var REFERENCE_DESC = 'desc';

    // Sequence
    var SEQUENCE = 'sequence';
    var SEQUENCE_ID_SOURCE_ATTR = 'id_source';
    var SEQUENCE_ID_REF_ATTR = 'id_ref';
    var SEQUENCE_TYPE_ATTR = 'type';
    var SEQUENCE_SYMBOL = 'symbol';
    var SEQUENCE_NAME = 'name';
    var SEQUENCE_GENE_NAME = 'gene_name';
    var SEQUENCE_LOCATION = 'location';

    // Taxonomy
    var TAXONOMY = 'taxonomy';
    var TAXONOMY_CODE = 'code';
    var TAXONOMY_SCIENTIFIC_NAME = 'scientific_name';
    var TAXONOMY_AUTHORITY = 'authority';
    var TAXONOMY_COMMON_NAME = 'common_name';
    var TAXONOMY_SYNONYM = 'synonym';
    var TAXONOMY_RANK = 'rank';

    // Uri
    var URI = 'uri';
    var URI_TYPE_ATTR = 'type';
    var URI_DESC_ATTR = 'desc';

    // Phylogeny
    var PHYLOGENY_ROOTED_ATTR = 'rooted';
    var PHYLOGENY_REROOTABLE_ATTR = 'rerootable';
    var PHYLOGENY_BRANCH_LENGTH_UNIT_ATTR = 'branch_length_unit';
    var PHYLOGENY_TYPE_ATTR = 'type';
    var PHYLOGENY_NAME = 'name';
    var PHYLOGENY_DESCRIPTION = 'description';
    var PHYLOGENY_DATE = 'date';

    // --------------------------------------------------------------
    // Instance variables
    // --------------------------------------------------------------
    var _phylogenies = null;
    var _phylogeny = null;
    var _cladeStack = null;
    var _tagStack = null;
    var _objectStack = null;

    // --------------------------------------------------------------
    // Functions for object creation
    // --------------------------------------------------------------
    function newAccession(tag) {
        var parent = _tagStack.get(1);
        if (!(parent == SEQUENCE || parent == CROSS_REFERENCES)) {
            throw new PhyloXmlError("found accession outside of sequence or cross-references");
        }
        var acc = {};
        acc.value = null;
        acc.source = getAttribute(ACCESSION_SOURCE_ATTR, tag.attributes);
        acc.comment = getAttribute(ACCESSION_COMMENT_ATTR, tag.attributes);
        if (parent == SEQUENCE) {
            getCurrentObject().accession = acc;
        }
        else {
            addToArrayInCurrentObjectUnnamed(acc);
        }
        _objectStack.push(acc);
    }

    function newAnnotation(tag) {
        var parent = _tagStack.get(1);
        if (parent != SEQUENCE) {
            throw new PhyloXmlError("found annotation outside of sequence");
        }
        var ann = {};
        ann.evidence = getAttribute(ANNOTATION_EVIDENCE_ATTR, tag.attributes);
        ann.ref = getAttribute(ANNOTATION_REF_ATTR, tag.attributes);
        ann.source = getAttribute(ANNOTATION_SOURCE_ATTR, tag.attributes);
        ann.type = getAttribute(ANNOTATION_TYPE_ATTR, tag.attributes);
        addToArrayInCurrentObject('annotations', ann);
        _objectStack.push(ann);
    }

    function newBranchColor() {
        var parent = _tagStack.get(1);
        if (parent != CLADE) {
            throw new PhyloXmlError("found branch color outside of clade");
        }
        var col = {};
        col.red = null;
        col.green = null;
        col.blue = null;
        getCurrentObject().color = col;
        _objectStack.push(col);
    }

    function newClade(tag) {
        var newClade = {};
        newClade.branch_length = getAttributeAsFloat(CLADE_BRANCH_LENGTH, tag.attributes);
        newClade.collapse = getAttributeAsBoolean(CLADE_COLLAPSE_ATTR, tag.attributes);
        if (CLADE_ID_SOURCE_ATTR in tag.attributes) {
            newClade.id_source = tag.attributes[CLADE_ID_SOURCE_ATTR];
        }
        if (_phylogeny == null) {
            var phylogeny_data = _objectStack.pop();
            if (!_objectStack.isEmpty()) {
                throw new PhyloXmlError('severe phyloXML format error');
            }
            _phylogeny = phylogeny_data;
            _phylogeny.children = [newClade];
        }
        else {
            var currClade = getCurrentClade();
            if (currClade.children == undefined) {
                currClade.children = [newClade];
            }
            else {
                currClade.children.push(newClade);
            }
        }
        _cladeStack.push(newClade);
        _objectStack.push(newClade);
    }

    function newCladeRelation(tag) {
        var cr = {};
        cr.distance = getAttributeAsFloat(CLADE_RELATION_DISTANCE_ATTR, tag.attributes);
        cr.id_ref_0 = getAttribute(CLADE_RELATION_ID_REF_0_ATTR, tag.attributes);
        cr.id_ref_1 = getAttribute(CLADE_RELATION_ID_REF_1_ATTR, tag.attributes);
        cr.type = getAttribute(CLADE_RELATION_TYPE_ATTR, tag.attributes);
        addToArrayInCurrentObject('clade_relations', cr);
        _objectStack.push(cr);
    }

    function newSequenceRelation(tag) {
        var sr = {};
        sr.distance = getAttributeAsFloat(SEQUENCE_RELATION_DISTANCE_ATTR, tag.attributes);
        sr.id_ref_0 = getAttribute(SEQUENCE_RELATION_ID_REF_0_ATTR, tag.attributes);
        sr.id_ref_1 = getAttribute(SEQUENCE_RELATION_ID_REF_1_ATTR, tag.attributes);
        sr.type = getAttribute(SEQUENCE_RELATION_TYPE_ATTR, tag.attributes);
        addToArrayInCurrentObject('sequence_relations', sr);
        _objectStack.push(sr);
    }

    function newConfidence(tag) {
        var conf = {};
        conf.value = null;
        conf.type = getAttribute(CONFIDENCE_TYPE_ATTR, tag.attributes);
        conf.stddev = getAttributeAsFloat(CONFIDENCE_STDDEV_ATTR, tag.attributes);
        var parent = _tagStack.get(1);
        if (parent == CLADE || parent == PHYLOGENY) {
            addToArrayInCurrentObject('confidences', conf);
        }
        else if (parent == ANNOTATION || parent == EVENTS || parent == CLADE_RELATION || parent == SEQUENCE_RELATION) {
            getCurrentObject().confidence = conf;
        }
        _objectStack.push(conf);
    }

    function newCrossReferences() {
        var parent = _tagStack.get(1);
        if (parent != SEQUENCE) {
            throw new PhyloXmlError("found cross-reference outside of sequence");
        }
        var xrefs = [];
        getCurrentObject().cross_references = xrefs;
        _objectStack.push(xrefs);
    }

    function newDate(tag) {
        var date = {};
        date.unit = getAttribute(DATE_UNIT_ATTR, tag.attributes);
        getCurrentObject().date = date;
        _objectStack.push(date);
    }

    function newDistribution(tag) {
        var dist = {};
        dist.desc = null;
        dist.unit = getAttribute(DATE_UNIT_ATTR, tag.attributes);
        addToArrayInCurrentObject('distributions', dist);
        _objectStack.push(dist);
    }

    function newDomainArchitecture(tag) {
        var da = {};
        da.domains = null;
        da.length = getAttributeAsInt(DOMAIN_ARCHITECTURE_LENGTH_ATTR, tag.attributes);
        getCurrentObject().domain_architecture = da;
        _objectStack.push(da);
    }

    function newEvents() {
        var events = {};
        getCurrentObject().events = events;
        _objectStack.push(events);
    }

    function newId(tag) {
        var i = {};
        i.value = null;
        i.provider = getAttribute(ID_PROVIDER_ATTR, tag.attributes);
        getCurrentObject().id = i;
        _objectStack.push(i);
    }

    function newMolecularSequence(tag) {
        var mol_seq = {};
        mol_seq.is_aligned = getAttributeAsBoolean(MOLSEQ_IS_ALIGNED_ATTR, tag.attributes);
        getCurrentObject().mol_seq = mol_seq;
        _objectStack.push(mol_seq);
    }

    function newPoint(tag) {
        var p = {};
        p.alt_unit = getAttribute(POINT_ALT_UNIT_ATTR, tag.attributes);
        p.geodetic_datum = getAttribute(POINT_GEODETIC_DATUM_ATTR, tag.attributes);
        var parent = _tagStack.get(1);
        if (parent == DISTRIBUTION) {
            addToArrayInCurrentObject('points', p);
        }
        _objectStack.push(p);
    }

    function newProperty(tag) {
        var prop = {};
        prop.ref = getAttribute(PROPERTY_REF_ATTR, tag.attributes);
        prop.unit = getAttribute(PROPERTY_UNIT_ATTR, tag.attributes);
        prop.datatype = getAttribute(PROPERTY_DATATYPE_ATTR, tag.attributes);
        prop.applies_to = getAttribute(PROPERTY_APPLIES_TO_ATTR, tag.attributes);
        prop.id_ref = getAttribute(PROPERTY_ID_REF_ATTR, tag.attributes);
        addToArrayInCurrentObject('properties', prop);
        _objectStack.push(prop);
    }

    function newProteinDomain(tag) {
        var pd = {};
        pd.name = null;
        pd.from = getAttributeAsInt(PROTEINDOMAIN_FROM_ATTR, tag.attributes);
        pd.to = getAttributeAsInt(PROTEINDOMAIN_TO_ATTR, tag.attributes);
        pd.confidence = getAttributeAsFloat(PROTEINDOMAIN_CONFIDENCE_ATTR, tag.attributes);
        pd.id = getAttribute(PROTEINDOMAIN_ID_ATTR, tag.attributes);
        addToArrayInCurrentObject('domains', pd);
        _objectStack.push(pd);
    }

    function newReference(tag) {
        var reference = {};
        reference.doi = getAttribute(REFERENCE_DOI_ATTR, tag.attributes);
        addToArrayInCurrentObject('references', reference);
        _objectStack.push(reference);
    }

    function newSequence(tag) {
        var seq = {};
        seq.type = getAttribute(SEQUENCE_TYPE_ATTR, tag.attributes);
        seq.id_source = getAttribute(SEQUENCE_ID_SOURCE_ATTR, tag.attributes);
        seq.id_ref = getAttribute(SEQUENCE_ID_REF_ATTR, tag.attributes);
        addToArrayInCurrentObject('sequences', seq);
        _objectStack.push(seq);
    }

    function newTaxonomy(tag) {
        var tax = {};
        tax.id_source = getAttribute(CLADE_ID_SOURCE_ATTR, tag.attributes);
        addToArrayInCurrentObject('taxonomies', tax);
        _objectStack.push(tax);
    }

    function newUri(tag) {
        var uri = {};
        uri.value = null;
        uri.desc = getAttribute(URI_DESC_ATTR, tag.attributes);
        uri.type = getAttribute(URI_TYPE_ATTR, tag.attributes);
        addToArrayInCurrentObject('uris', uri);
        _objectStack.push(uri);
    }

    function newPhylogeny(tag) {
        var phy = {};
        phy.rooted = getAttributeAsBoolean(PHYLOGENY_ROOTED_ATTR, tag.attributes);
        phy.rerootable = getAttributeAsBoolean(PHYLOGENY_REROOTABLE_ATTR, tag.attributes);
        phy.branch_length_unit = getAttribute(PHYLOGENY_BRANCH_LENGTH_UNIT_ATTR, tag.attributes);
        phy.type = getAttribute(PHYLOGENY_TYPE_ATTR, tag.attributes);
        _objectStack.push(phy);
    }

    // --------------------------------------------------------------
    // Functions for processing text
    // --------------------------------------------------------------

    function inAccession(text) {
        getCurrentObject().value = text;
    }

    function inAnnotation(text) {
        if (getCurrentTag() == ANNOTATION_DESC) {
            getCurrentObject().desc = text;
        }
    }

    function inBranchColor(text) {
        if (getCurrentTag() == COLOR_RED) {
            getCurrentObject().red = parseIntNumber(text);
        }
        else if (getCurrentTag() == COLOR_GREEN) {
            getCurrentObject().green = parseIntNumber(text);
        }
        else if (getCurrentTag() == COLOR_BLUE) {
            getCurrentObject().blue = parseIntNumber(text);
        }
        if (getCurrentTag() == COLOR_ALPHA) {
            getCurrentObject().alpha = parseIntNumber(text);
        }
    }

    function inClade(text) {
        if (getCurrentTag() == CLADE_NAME) {
            getCurrentClade().name = text;
        }
        else if (getCurrentTag() == CLADE_BRANCH_LENGTH) {
            getCurrentClade().branch_length = parseFloatNumber(text);
        }
        else if (getCurrentTag() == CLADE_WIDTH) {
            getCurrentClade().width = parseFloatNumber(text);
        }
    }

    function inConfidence(text) {
        getCurrentObject().value = parseFloatNumber(text);
    }

    function inDate(text) {
        if (getCurrentTag() == DATE_DESC) {
            getCurrentObject().desc = text;
        }
        else if (getCurrentTag() == DATE_VALUE) {
            getCurrentObject().value = parseFloatNumber(text);
        }
        else if (getCurrentTag() == DATE_MINIMUM) {
            getCurrentObject().minimum = parseFloatNumber(text);
        }
        else if (getCurrentTag() == DATE_MAXIMUM) {
            getCurrentObject().maximum = parseFloatNumber(text);
        }
    }

    function inDistribution(text) {
        if (getCurrentTag() == DISTRIBUTION_DESC) {
            getCurrentObject().desc = text;
        }
    }

    function inEvents(text) {
        if (getCurrentTag() == EVENTS_TYPE) {
            getCurrentObject().type = text;
        }
        else if (getCurrentTag() == EVENTS_DUPLICATIONS) {
            getCurrentObject().duplications = parseIntNumber(text);
        }
        else if (getCurrentTag() == EVENTS_SPECIATIONs) {
            getCurrentObject().speciations = parseIntNumber(text);
        }
        else if (getCurrentTag() == EVENTS_LOSSES) {
            getCurrentObject().losses = parseIntNumber(text);
        }
    }

    function inId(text) {
        getCurrentObject().value = text;
    }

    function inMolecularSequence(text) {
        getCurrentObject().value = text;
    }

    function inPoint(text) {
        if (getCurrentTag() == POINT_LAT) {
            getCurrentObject().lat = text;
        }
        else if (getCurrentTag() == POINT_LONG) {
            getCurrentObject().long = text;
        }
        else if (getCurrentTag() == POINT_ALT) {
            getCurrentObject().alt = text;
        }
    }

    function inProperty(text) {
        getCurrentObject().value = text;
    }

    function inProteinDomain(text) {
        getCurrentObject().name = text;
    }

    function inPhylogeny(text) {
        if (getCurrentTag() == PHYLOGENY_NAME) {
            getCurrentObject().name = text;
        }
        else if (getCurrentTag() == PHYLOGENY_DESCRIPTION) {
            getCurrentObject().description = text;
        }
        else if (getCurrentTag() == PHYLOGENY_DATE) {
            getCurrentObject().date = text;
        }
    }

    function inReference(text) {
        if (getCurrentTag() == REFERENCE_DESC) {
            getCurrentObject().desc = text;
        }
    }

    function inSequence(text) {
        if (getCurrentTag() == SEQUENCE_SYMBOL) {
            getCurrentObject().symbol = text;
        }
        else if (getCurrentTag() == SEQUENCE_NAME) {
            getCurrentObject().name = text;
        }
        else if (getCurrentTag() == SEQUENCE_GENE_NAME) {
            getCurrentObject().gene_name = text;
        }
        else if (getCurrentTag() == SEQUENCE_LOCATION) {
            getCurrentObject().location = text;
        }
    }

    function inTaxonomy(text) {
        if (getCurrentTag() == TAXONOMY_CODE) {
            getCurrentObject().code = text;
        }
        else if (getCurrentTag() == TAXONOMY_SCIENTIFIC_NAME) {
            getCurrentObject().scientific_name = text;
        }
        else if (getCurrentTag() == TAXONOMY_AUTHORITY) {
            getCurrentObject().authority = text;
        }
        else if (getCurrentTag() == TAXONOMY_COMMON_NAME) {
            getCurrentObject().common_name = text;
        }
        else if (getCurrentTag() == TAXONOMY_SYNONYM) {
            addToArrayInCurrentObject('synonyms', text);
        }
        else if (getCurrentTag() == TAXONOMY_RANK) {
            getCurrentObject().rank = text;
        }
    }

    function inUri(text) {
        getCurrentObject().value = text;
    }

    // --------------------------------------------------------------
    // Functions for SAX parser
    // --------------------------------------------------------------
    function phyloxmlOnopentag(tag) {
        _tagStack.push(tag.name);
        switch (tag.name) {
            case CLADE:
                newClade(tag);
                break;
            case ACCESSION:
                newAccession(tag);
                break;
            case ANNOTATION:
                newAnnotation(tag);
                break;
            case CLADE_RELATION:
                if (_tagStack.get(1) == PHYLOGENY) {
                    newCladeRelation(tag);
                }
                break;
            case COLOR:
                newBranchColor();
                break;
            case CONFIDENCE:
                newConfidence(tag);
                break;
            case CROSS_REFERENCES:
                newCrossReferences();
                break;
            case DATE:
                if (_tagStack.get(1) == CLADE) {
                    newDate(tag);
                }
                break;
            case DISTRIBUTION:
                newDistribution(tag);
                break;
            case DOMAIN_ARCHITECTURE:
                newDomainArchitecture(tag);
                break;
            case EVENTS:
                newEvents();
                break;
            case ID:
                newId(tag);
                break;
            case MOLSEQ:
                newMolecularSequence(tag);
                break;
            case POINT:
                newPoint(tag);
                break;
            case PROTEINDOMAIN:
                newProteinDomain(tag);
                break;
            case PHYLOGENY:
                newPhylogeny(tag);
                break;
            case PROPERTY:
                newProperty(tag);
                break;
            case REFERENCE:
                newReference(tag);
                break;
            case SEQUENCE:
                newSequence(tag);
                break;
            case SEQUENCE_RELATION:
                if (_tagStack.get(1) == PHYLOGENY) {
                    newSequenceRelation(tag);
                }
                break;
            case TAXONOMY:
                newTaxonomy(tag);
                break;
            case URI:
                newUri(tag);
                break;
            default:
        }
    }

    function phyloxmlOnclosetag(tag) {
        if (tag == CLADE) {
            _tagStack.pop();
            _objectStack.pop();
            _cladeStack.pop();
        }
        else if (
            tag == ACCESSION
            || tag == ANNOTATION
            || ( tag == CLADE_RELATION && (_tagStack.get(1) == PHYLOGENY) )
            || tag == COLOR
            || tag == CONFIDENCE
            || tag == CROSS_REFERENCES
            || ( tag == DATE && (_tagStack.get(1) == CLADE) )
            || tag == DISTRIBUTION
            || tag == TAXONOMY
            || tag == ID
            || tag == EVENTS
            || tag == MOLSEQ
            || tag == REFERENCE
            || tag == DOMAIN_ARCHITECTURE
            || tag == PROTEINDOMAIN
            || tag == SEQUENCE
            || ( tag == SEQUENCE_RELATION && (_tagStack.get(1) == PHYLOGENY) )
            || tag == PROPERTY
            || tag == POINT
            || tag == URI) {
            _tagStack.pop();
            _objectStack.pop();
        }
        else if (!(tag == PHYLOGENY || tag == PHYLOXML)) {
            _tagStack.pop();
        }
        else if (tag == PHYLOGENY) {
            phyloxmlOnClosetagSanityCheck();
            _phylogenies.push(_phylogeny);
            startNewPhylogeny();
        }
    }

    function phyloxmlOntext(text) {
        var parentTag = _tagStack.get(1);
        var currentTag = _tagStack.peek();
        if (parentTag == CLADE) {
            inClade(text);
        }
        else if (parentTag == ANNOTATION) {
            inAnnotation(text);
        }
        else if (parentTag == COLOR) {
            inBranchColor(text);
        }
        else if (parentTag == DATE) {
            inDate(text);
        }
        else if (parentTag == DISTRIBUTION) {
            inDistribution(text);
        }
        else if (parentTag == EVENTS) {
            inEvents(text);
        }
        else if (parentTag == REFERENCE) {
            inReference(text);
        }
        else if (parentTag == PHYLOGENY) {
            inPhylogeny(text);
        }
        else if (parentTag == POINT) {
            inPoint(text);
        }
        else if (parentTag == SEQUENCE) {
            inSequence(text);
        }
        else if (parentTag == TAXONOMY) {
            inTaxonomy(text);
        }

        if (currentTag == ACCESSION) {
            inAccession(text);
        }
        else if (currentTag == CONFIDENCE) {
            inConfidence(text);
        }
        else if (currentTag == ID) {
            inId(text);
        }
        else if (currentTag == MOLSEQ) {
            inMolecularSequence(text);
        }
        else if (currentTag == PROTEINDOMAIN) {
            inProteinDomain(text);
        }
        else if (currentTag == PROPERTY) {
            inProperty(text);
        }
        else if (currentTag == URI) {
            inUri(text);
        }
    }

    function phyloxmlOnerror(error) {
        console.error(error);
        throw error;
    }

    function addPhyloxmlParserEvents(sax_parser) {
        sax_parser.onopentag = phyloxmlOnopentag;
        sax_parser.onclosetag = phyloxmlOnclosetag;
        sax_parser.ontext = phyloxmlOntext;
        sax_parser.onerror = phyloxmlOnerror;
        // Ignoring: oncdata, oncomment, ondoctype
    }

    // --------------------------------------------------------------
    // Helper functions
    // --------------------------------------------------------------
    function getCurrentClade() {
        return _cladeStack.peek();
    }

    function getCurrentTag() {
        return _tagStack.peek();
    }

    function getCurrentObject() {
        return _objectStack.peek();
    }

    function getAttribute(attribute_name, attributes) {
        if (attribute_name in attributes) {
            return attributes[attribute_name];
        }
        return undefined;
    }

    function getAttributeAsInt(attribute_name, attributes) {
        if (attribute_name in attributes) {
            return parseIntNumber(attributes[attribute_name]);
        }
        return undefined;
    }

    function getAttributeAsFloat(attribute_name, attributes) {
        if (attribute_name in attributes) {
            return parseFloatNumber(attributes[attribute_name]);
        }
        return undefined;
    }

    function getAttributeAsBoolean(attribute_name, attributes) {
        if (attribute_name in attributes) {
            return parseBoolean(attributes[attribute_name]);
        }
        return undefined;
    }

    function addToArrayInCurrentObject(name, value) {
        var parent = null;
        if (getCurrentObject()) {
            parent = getCurrentObject();
        }
        else {
            parent = _phylogeny;
        }
        var ary = parent[name];
        if (ary == undefined) {
            parent[name] = [value];
        }
        else {
            ary.push(value);
        }
    }

    function addToArrayInCurrentObjectUnnamed(value) {
        var obj = getCurrentObject();
        obj.push(value);
    }

    function parseFloatNumber(text) {
        var f = parseFloat(text);
        if (isNaN(f)) {
            throw new PhyloXmlError("could not parse floating point number from '" + text + "'");
        }
        return f;
    }

    function parseIntNumber(text) {
        var i = parseInt(text);
        if (isNaN(i)) {
            throw new PhyloXmlError("could not parse integer number from '" + text + "'");
        }
        return i;
    }

    function parseBoolean(text) {
        if (text == 'true') {
            return true;
        }
        else if (text == 'false') {
            return false;
        }
        else {
            throw new PhyloXmlError("could not parse boolean from '" + text + "'");
        }
    }

    function startNewPhylogeny() {
        _phylogeny = null;
        _cladeStack = new Stack();
        _tagStack = new Stack();
        _objectStack = new Stack();
    }

    function phyloxmlOnClosetagSanityCheck() {
        if (!(_cladeStack.isEmpty() && _objectStack.isEmpty() )) {
            throw new PhyloXmlError('severe phyloXML format error')
        }
    }

    function finalSanityCheck() {
        if (!_tagStack.isEmpty()) {
            throw new PhyloXmlError('severe phyloXML format error');
        }
    }

    // --------------------------------------------------------------
    // Stack
    // --------------------------------------------------------------
    function Stack() {
        this._stack = [];
        this.pop = function () {
            var p = this._stack.pop();
            if (p == undefined) {
                throw new Error('severe phyloXML format error')
            }
            return p;
        };
        this.push = function (item) {
            this._stack.push(item);
        };
        this.peek = function () {
            return this._stack[this._stack.length - 1];
        };
        this.get = function (i) {
            return this._stack[this._stack.length - (1 + i)];
        };
        this.length = function () {
            return this._stack.length;
        };
        this.isEmpty = function () {
            return this._stack.length < 1;
        };
    }

    // --------------------------------------------------------------
    // phyloXML error
    // --------------------------------------------------------------
    function PhyloXmlError(message) {
        this.name = 'phyloXmlError';
        this.message = message || 'phyloXML format error';
    }

    PhyloXmlError.prototype = Object.create(Error.prototype);

    // --------------------------------------------------------------
    // Main functions
    // --------------------------------------------------------------
    phyloXmlParser.parseAsync = function (stream, parse_options) {
        _phylogenies = [];
        startNewPhylogeny();
        var sax_parser = sax.createStream(true, parse_options);
        addPhyloxmlParserEvents(sax_parser);
        stream.pipe(sax_parser);

        sax_parser.on('end', function () {
            finalSanityCheck();
            var len = _phylogenies.length;
            console.log("Parsed " + len + " trees:");
            for (var i = 0; i < len; i++) {
                console.log();
                console.log("Tree (async) " + i + ":");
                var str = JSON.stringify(_phylogenies[i], null, 2);
                console.log(str);
            }
        });

        process.stdout.on('drain', function () {
            stream.resume();
        });
    };

    phyloXmlParser.parse = function (source, parse_options) {
        source && ( source = source.toString().trim());

        if (!source) {
            throw new Error('phyloXML source is empty');
        }

        _phylogenies = [];
        startNewPhylogeny();
        var sax_parser = sax.parser(true, parse_options);
        addPhyloxmlParserEvents(sax_parser);

        sax_parser.onend = function () {
            finalSanityCheck();
        };

        sax_parser.write(source).close();
        return _phylogenies;
    };

    // --------------------------------------------------------------
    // For exporting
    // --------------------------------------------------------------
    if (typeof module !== 'undefined' && module.exports && !global.xmldocAssumeBrowser)
        module.exports.phyloXmlParser = phyloXmlParser;
    else if (typeof window !== "undefined")
        window.phyloXmlParser = phyloXmlParser;
    else
        this.phyloXmlParser = phyloXmlParser;
})();